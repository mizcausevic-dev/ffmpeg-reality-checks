// fs07 adds no measurement of its own: it re-uses the fl07 evidence files (evidence-6.1.1.json, evidence-8.1.2.json) and checks its script, scenes and kit against them.
import {packTests} from '../../fl07/test/pack.mjs';
packTests('fs07');
