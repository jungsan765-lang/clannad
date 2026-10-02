"""Routing regression tests. Sandboxed commands never access production or the Internet."""
import base64
import http.server
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / 'tools'
ROOTS = ('1','a','genshin','gg','ggg','mt','mtg','mtt','mttg','oc','rfy','rfya')


def candidate():
    source = (TOOLS / 'activate-seoul-production.sh').read_text()
    text = source.split('cat >"$CANDIDATE" <<EOF\n', 1)[1].split('\nEOF', 1)[0]
    return text.replace('$DOMAIN', 'clannad.shop') + '\n'


class RoutingGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        subprocess.run(['git','init','-q',str(self.repo)], check=True)
        for name in ROOTS:
            path = self.repo / name / ('tefs/1.png' if name == '1' else 'nested space/1.png')
            path.parent.mkdir(parents=True)
            path.write_bytes(b'fixture')
        self.commit()
        self.etc = self.root / 'etc'
        (self.etc / 'conf.d').mkdir(parents=True)
        (self.etc / 'Caddyfile').write_text('import '+str(self.etc / 'conf.d')+'/*.caddy\n')
        self.target = self.etc / 'conf.d/production.caddy'
        self.old = 'clannad.shop {\n    respond "old configuration"\n}\n'
        self.target.write_text(self.old)
        self.input = self.root / 'candidate'
        self.input.write_text(candidate())
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        fake = '''#!/usr/bin/python3
import os,pathlib,sys
root=pathlib.Path(os.environ['MOCK_ROOT']);mode=os.environ.get('FAIL_MODE','');name=pathlib.Path(sys.argv[0]).name
with (root/'calls').open('a') as f:f.write(name+' '+' '.join(sys.argv[1:])+'\\n')
reloads=root/'reloads';validators=root/'validators'
if name=='systemctl':
 n=int(reloads.read_text())+1 if reloads.exists() else 1;reloads.write_text(str(n))
 if mode=='reload' and n==1:sys.exit(1)
elif name=='caddy':
 n=int(validators.read_text())+1 if validators.exists() else 1;validators.write_text(str(n))
 if mode=='validation' and n==3:sys.exit(1)
elif name=='curl':
 url=next(a for a in sys.argv[1:] if a.startswith('https://'))
 upstream='raw.githubusercontent.com' in url
 head='--head' in sys.argv
 if upstream and mode=='upstream':sys.exit(22)
 if head:
  if not upstream and mode=='image404':sys.exit(22)
  print('200 text/html' if not upstream and mode=='html' else '200 image/png',end='')
 else:print('503' if reloads.exists() and mode=='endpoint' else '200',end='')
'''
        for name in ('curl','caddy','systemctl'):
            path = self.bin / name
            path.write_text(fake)
            path.chmod(0o755)
        source = (TOOLS / 'apply-production-caddy.sh').read_text()
        source = source.replace('/etc/caddy', str(self.etc))
        source = source.replace('/run/lock/clannad-caddy-production.lock', str(self.root / 'lock'))
        # Only root-check and filesystem destinations differ in the sandbox.
        source = source.replace('[[ $EUID -eq 0 ]]', '[[ 0 -eq 0 ]]')
        self.script = self.root / 'guard.sh'
        self.script.write_text(source)

    def commit(self):
        subprocess.run(['git','-C',str(self.repo),'add','.'], check=True)
        subprocess.run(['git','-C',str(self.repo),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid',
                        'commit','-qm','fixture'], check=True)

    def run_guard(self, mode=''):
        env = {**os.environ, 'PATH':str(self.bin)+os.pathsep+os.environ['PATH'],
               'MOCK_ROOT':str(self.root), 'FAIL_MODE':mode}
        return subprocess.run(['bash',str(self.script),str(self.input),'clannad.shop',str(self.repo)],
                              env=env, text=True, capture_output=True, timeout=30)

    def test_success_and_repeat(self):
        for _ in range(2):
            result = self.run_guard()
            self.assertEqual(result.returncode, 0, result.stdout+result.stderr)
            self.assertEqual(self.target.read_text(), candidate())
        self.assertEqual(len(re.findall(r'^\s*@clannadLegacyImages \{', self.target.read_text(), re.M)), 1)
        self.assertIn('nested%20space', (self.root/'calls').read_text())

    def test_each_failure_restores_config(self):
        for mode in ('upstream','validation','reload','image404','html','endpoint'):
            with self.subTest(mode=mode):
                self.target.write_text(self.old)
                for file in ('calls','validators','reloads'):
                    (self.root/file).unlink(missing_ok=True)
                result = self.run_guard(mode)
                self.assertNotEqual(result.returncode, 0, result.stdout+result.stderr)
                self.assertEqual(self.target.read_text(), self.old)
                if mode != 'upstream':
                    self.assertIn('previous on-disk configuration restored', result.stderr)

    def test_missing_route_rejected_before_change(self):
        self.input.write_text(candidate().replace(' /rfya/*',''))
        result = self.run_guard()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.target.read_text(), self.old)
        self.assertFalse((self.root/'calls').exists())

    def test_new_uncovered_namespace_blocks_change(self):
        (self.repo/'new-images').mkdir()
        (self.repo/'new-images/a.png').write_bytes(b'fixture')
        self.commit()
        result = self.run_guard()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Uncovered legacy image path', result.stderr)
        self.assertEqual(self.target.read_text(), self.old)

    def test_missing_inventory_blocks_change(self):
        shutil.rmtree(self.repo/'rfya')
        self.commit()
        result = self.run_guard()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Image tree missing', result.stderr)
        self.assertEqual(self.target.read_text(), self.old)

    def test_staging_has_no_production_activation(self):
        source = (TOOLS/'fixed-region-autodeploy.sh').read_text()
        self.assertNotIn('activate-seoul-production.sh', source)
        self.assertNotIn('/var/www/genshin-crpg-production', source)
        for file in ('install-fixed-region-live-staging.sh','set-fixed-region-domain.sh'):
            source = (TOOLS/file).read_text()
            self.assertIn('if [[ ! -f /etc/caddy/Caddyfile ]]; then\ncat >', source)
            self.assertIn('${API_DOMAIN,,}" == clannad.shop', source)
            self.assertNotIn('cat >"$CADDY_DIR/production.caddy"', source)

    def test_shell_syntax_and_activation_guard(self):
        for name in ('activate-seoul-production.sh','fixed-region-autodeploy.sh','apply-production-caddy.sh',
                     'install-fixed-region-live-staging.sh','set-fixed-region-domain.sh','restore-legacy-images.sh'):
            subprocess.run(['bash','-n',str(TOOLS/name)],check=True)
        source = (TOOLS/'activate-seoul-production.sh').read_text()
        self.assertIn('bash "$SCRIPT_DIR/apply-production-caddy.sh" "$CANDIDATE" "$DOMAIN"', source)
        self.assertNotIn('systemctl reload caddy', source)
        self.assertNotIn('cat >"$CADDY_DIR/production.caddy"', source)


class RealCaddyTests(unittest.TestCase):
    def test_real_http_routing_and_header_isolation(self):
        caddy = shutil.which('caddy')
        if not caddy:
            if os.environ.get('REQUIRE_CADDY') == '1': self.fail('Caddy must be installed in CI')
            self.skipTest('Caddy not installed; mock tests are not live Caddy verification')
        requests = []
        png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA6cAAAAASUVORK5CYII=')
        class Origin(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                requests.append((self.path, dict(self.headers)))
                image = self.path.startswith('/jungsan765-lang/clannad/main/')
                body = png if image else b'API_SENTINEL'
                self.send_response(200)
                self.send_header('Content-Type','image/png' if image else 'text/plain')
                self.send_header('Content-Length',str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            def do_HEAD(self): self.do_GET()
            def log_message(self,*args): pass
        origin = http.server.ThreadingHTTPServer(('127.0.0.1',0),Origin)
        thread = threading.Thread(target=origin.serve_forever,daemon=True);thread.start()
        self.addCleanup(origin.server_close);self.addCleanup(origin.shutdown)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            webroot = root/'web';webroot.mkdir();(webroot/'index.html').write_text('GAME_SENTINEL')
            sock = socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
            upstream = '127.0.0.1:'+str(origin.server_port)
            config = candidate().replace('clannad.shop {', 'http://127.0.0.1:'+str(port)+' {',1)
            config = config.replace('https://raw.githubusercontent.com', 'http://'+upstream)
            config = config.replace('127.0.0.1:8790',upstream).replace('127.0.0.1:8788',upstream)
            config = config.replace('/var/www/genshin-crpg-production/current',str(webroot))
            config = '{\n    admin off\n    auto_https off\n}\n'+config
            path = root/'Caddyfile';path.write_text(config)
            subprocess.run([caddy,'validate','--config',str(path),'--adapter','caddyfile'],check=True,capture_output=True)
            log = (root/'caddy.log').open('w+')
            process = subprocess.Popen([caddy,'run','--config',str(path),'--adapter','caddyfile'],stdout=log,stderr=log)
            def get(path, method='GET', headers=None):
                req=urllib.request.Request('http://127.0.0.1:'+str(port)+path,method=method,headers=headers or {})
                try:
                    with urllib.request.urlopen(req,timeout=3) as r:return r.status,r.headers,r.read()
                except urllib.error.HTTPError as e:return e.code,e.headers,e.read()
            try:
                for _ in range(60):
                    if process.poll() is not None:
                        log.flush();log.seek(0);self.fail(log.read())
                    try:
                        if get('/')[0] == 200:break
                    except urllib.error.URLError: pass
                    time.sleep(.1)
                else:self.fail('Caddy did not start')
                for name in ROOTS:
                    for method in ('GET','HEAD'):
                        status,headers,body=get('/'+name+'/nested%20space/1.PNG?check=1',method,
                                                {'Cookie':'private=secret','Authorization':'Bearer private',
                                                 'Referer':'https://private.example/','Origin':'https://private.example'})
                        self.assertEqual(status,200,name)
                        self.assertEqual(headers.get_content_type(),'image/png')
                        if method == 'GET':self.assertEqual(body,png)
                        observed={k.lower():v for k,v in requests[-1][1].items()}
                        for header in ('cookie','authorization','referer','origin'):
                            self.assertNotIn(header,observed)
                        self.assertTrue(requests[-1][0].startswith('/jungsan765-lang/clannad/main/'+name+'/'))
                self.assertEqual(get('/')[2],b'GAME_SENTINEL')
                self.assertEqual(get('/genshin-crpg/dist/')[2],b'GAME_SENTINEL')
                self.assertEqual(get('/api/probe.png')[2],b'API_SENTINEL')
                before=len(requests)
                for url in ('/1/private.txt','/unknown/image.png','/genshin-crpg/source/image.png'):
                    self.assertEqual(get(url)[0],404,url)
                self.assertNotEqual(get('/1/tefs/1.png','POST')[0],200)
                self.assertEqual(len(requests),before)
            finally:
                process.terminate()
                try:process.wait(timeout=5)
                except subprocess.TimeoutExpired:process.kill();process.wait()
                log.close()


if __name__ == '__main__':
    unittest.main(verbosity=2)
