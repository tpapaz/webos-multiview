import copy
import json
import pathlib
import unittest
from jsonschema import Draft202012Validator

ROOT = pathlib.Path(__file__).resolve().parents[2]

class SchemaTest(unittest.TestCase):
    def test_generated_reports_and_rejections(self):
        schema = json.loads((ROOT / 'schemas/capability-v1.schema.json').read_text())
        Draft202012Validator.check_schema(schema)
        validator = Draft202012Validator(schema)
        reports = list((ROOT / 'build/reports').glob('*.report.json'))
        self.assertGreaterEqual(len(reports), 3)
        for path in reports:
            report = json.loads(path.read_text())
            validator.validate(report)
            for mutate in [lambda r: r.update(serialNumber='private'),
                           lambda r: r['device'].update(ip='private'),
                           lambda r: r.update(redactionApplied=False),
                           lambda r: r['capabilities']['simultaneousHdmiInputs'].update(status='verified')]:
                invalid = copy.deepcopy(report)
                mutate(invalid)
                self.assertFalse(validator.is_valid(invalid))

if __name__ == '__main__':
    unittest.main()
