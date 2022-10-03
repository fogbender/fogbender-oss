import json
import os
import fileinput

top_level_directory = "packages"
package_json = "package.json"
packages = [
    {"fogbender-vue":"util.ts"},
    {"fogbender-element":"utils.ts"},
    {"fogbender-react":"index.tsx"},
]

for package in packages:
    key, value = list(package.items())[0]

    packge_json_file = open(
        os.path.join(top_level_directory, key, package_json)
    )

    json_data = json.load(packge_json_file)

    version_number = json_data["version"]

    string_to_replace = 'token.versions["' + key + '"]'

    new_string = string_to_replace + " = " + '"' + version_number + '"' + ";"

    path_of_string_to_replace = os.path.join(top_level_directory, key, "src", value
    )

    packge_json_file.close()

    with fileinput.FileInput(
        path_of_string_to_replace,
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
