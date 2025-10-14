# schemaCheck.py -- wrapper for json schema Draft202012
import sys
import os.path
import argparse
import json
import jsonschema

parser = argparse.ArgumentParser(description='jsonschemaでスキーマを検証します.')
parser.add_argument('--schema', '-D', dest='applyschema',
    action='store_true',
    help='スキーマ中に指定されたスキーマを参照します.')
parser.add_argument(dest='infile', nargs='?', type=argparse.FileType('r', encoding='UTF-8'),
    default=sys.stdin, help='入力ファイル')

args = parser.parse_args()

try:
    schema_data = json.load(args.infile)
    schema_filename = args.infile.name

except json.JSONDecodeError as e:
    print('JSONパーサーエラー:', e, file=sys.stderr)
    sys.exit(1)

finally:
    args.infile.close()

try:
    print('ファイル {0} ("$id": "{1}") を検証します.'.format(schema_filename, schema_data['$id']))
    if not args.applyschema:
        print('jsonschema Draft202012 で検証します.')
        jsonschema.Draft202012Validator(schema_data)

    else:
        document_schema_name = schema_data['$schema']
        if not document_schema_name:
            print('エラー: ドキュメントにスキーマの指定がありません.')
            sys.exit(1)

        document_schema_filename = os.path.normpath(
            os.path.join(
                os.path.dirname(schema_filename),
                document_schema_name
                )
            )

        with open(document_schema_filename, mode='r', encoding='UTF-8') as f:
            document_schema = json.load(f)
            f.close()

        print('スキーマ {0}("$id": "{1}") で検証します.'.format(document_schema_filename, document_schema['$id']))
        jsonschema.validate(jsonschema, document_schema)
    
    print('スキーマにエラーは見つかりませんでした.\n')

except (jsonschema.FormatError, jsonschema.SchemaError, jsonschema.ValidationError) as e:
    print('JSON SCHEMAのエラー:', e, file=sys.stderr)
    sys.exit(1)

except OSError as e:
    print('システムエラー:', e, file=sys.stderr)
    sys.exit(1)

except json.JSONDecodeError as e:
    print('JSONパーサーエラー:', e, file=sys.stderr)
    sys.exit(1)

except:
    print('別の何らかのエラーです.', file=sys.stderr)
