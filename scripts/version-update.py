from pathlib import Path
import json
import re

for key, value in [
    ["fogbender-vue", "util.ts"],
    ["fogbender-element", "utils.ts"],
    ["fogbender-react", "index.tsx"],
]:
    packge_json_file = Path(f"packages/{key}/package.json")
    version = json.loads(packge_json_file.read_text())["version"]

    file = Path(f"packages/{key}/src/{value}")
    file.write_text(re.sub(
        r'('+key+'.+) "(.+)\";',
        f'\\1 "{version}";',
        file.read_text()
    ))
