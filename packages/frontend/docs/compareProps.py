# 
# 与えられたJSONファイル中のプロパティを列挙し比較する
import os, sys
from re import T
import argparse
import json

arg_parser = argparse.ArgumentParser(description='JSON schemaのプロパティを列挙・比較する.')
arg_parser.add_argument('-d', '--diff', dest='show_diff_only', type=bool, default=False, help='差分のみ表示します.')
arg_parser.add_argument('-I', '--without-id', dest='do_not_show_ids', type=bool, default=False, help='スキーマの$idを表示しません.')
arg_parser.add_argument('file1', nargs=1, type=argparse.FileType('r', encoding='UTF-8'), help='入力ファイル1')
arg_parser.add_argument('file2', nargs='?', type=argparse.FileType('r', encoding='UTF-8'), help='入力ファイル2')

args = arg_parser.parse_args()

# file1 のロードとJSON解析
try:
    json1 = json.load(args.file1[0])
except json.JSONDecodeError as e:
    print('JSONパーサーエラー: {0}'.format(e), file=sys.stderr)
    sys.exit(1)
finally:
    args.file1[0].close()

# file2 のロードとJSON解析
if args.file2 is not None:
    try:
        json2 = json.load(args.file2[0])
    except json.JSONDecodeError as e:
        print('JSONパーサーエラー: {0}'.format(e), file=sys.stderr)
        sys.exit(1)
    finally:
        args.file2[0].close()

else:
    # file1のプロパティ列挙のみ
    if args.do_not_show_ids != True:
        print('ファイル {0} ("$id": "{1}") :'.format(
            args.file1[0].name,
            json1['$id']
        ))

    try:
        document_type = json1['type']
    except KeyError:
        print('JSON schemaで定義されたドキュメントではないようです.', file=sys.stderr)
        sys.exit(1)

    if document_type == 'object':
        for prop_name in json1['properties'].keys():
            try:
                prop_type = json1['properties'][prop_name]['type']
            except KeyError:
                prop_type = '<undefined>'
            
            print('"{0}": type - {1}'.format(prop_name, prop_type))
    elif document_type == 'array':
        try:
            item_type = json1['items']['type']
        except KeyError:
            item_type = '<undefined>'
        finally:
            print('<document>:type = array\n item:type = {}'.format(item_type))
    else:
        print('<document>:type = {}'.format(document_type))
    print()
