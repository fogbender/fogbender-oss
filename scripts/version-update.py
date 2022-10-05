import json
import os
import fileinput

top_level_directory = "packages"
package_json = "package.json"
packages = [
    ["fogbender-vue", "util.ts"],
    ["fogbender-element", "utils.ts"],
    ["fogbender-react", "index.tsx"],
]

for key, value in packages:
    packge_json_file = open(
        os.path.join(top_level_directory, key, package_json)
    )
    version_number = json.load(packge_json_file)["version"]
    packge_json_file.close()
    string_to_replace = f'token.versions["{key}"]'
    new_string = f'{string_to_replace} = "{version_number}";'

    with fileinput.FileInput(
        os.path.join(top_level_directory, key, "src", value),
        inplace=True,
    ) as file:
        for line in file:
            if string_to_replace in line:
                replacement = line.replace(
                    line,
                    new_string,
                    1,
                )
                print(str(replacement),end="")
            else:
                print(line,end="")
        file.close()
