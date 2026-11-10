"""Validate local redacted reports. Does not contact a TV or upload data."""
import json
import pathlib
import sys
from jsonschema import Draft202012Validator

root = pathlib.Path(__file__).resolve().parents[1]
schema = json.loads((root / 'schemas/capability-v1.schema.json').read_text())
Draft202012Validator.check_schema(schema)
for filename in sys.argv[1:]:
    with open(filename, encoding='utf8') as source:
        Draft202012Validator(schema).validate(json.load(source))
    print('Report schema valid')
