# Combat rules — 0.4

Current implementation and limitations: [REVISION_0_4_KO.md](REVISION_0_4_KO.md).

Load the runtime scripts in source/index.html order. HOUSE_RULE_V1 geometry/reaction/card lifecycle is in source/runtime_rules.js; exact enemy scripts and phases are in source/runtime_andrius.js; public action/checkpoint policy is in source/runtime_flow.js. The previous undefined-topology and 8 Mond-active-card blockers are resolved. Lunar/star rules, all-world effects and full-route balance are not declared complete.

Run python3 tools/test_all.py for all16 bounded suites. Tests/test_rules.cjs, test_andrius.cjs and test_flow.cjs cover actual current engine order. Historical unit suites intentionally isolate their original modules.
