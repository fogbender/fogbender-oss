import json
import os
import fileinput

top_level_directory = "packages"
packages_dir_list = os.listdir("packages")
path_to_package_json_list = []
pkg_name_version_list = []
pkgs_to_modify = [
    {"name": "fogbender-vue", "vrsn_file_dest": "util.ts"},
    {"name": "fogbender-element", "vrsn_file_dest": "utils.ts"},
    {"name": "fogbender-react", "vrsn_file_dest": "index.tsx"},
]


def get_vrsn_file_from_dir_name(current_dir):
    vrsn_file_dest = None
    vrsn_no = None
    for pkg_info in pkgs_to_modify:
        if pkg_info["name"] == current_dir:
            vrsn_file_dest = pkg_info["vrsn_file_dest"]

    for pkg_version in pkg_name_version_list:
        if pkg_version["pkg_name"] == current_dir:
            vrsn_no = pkg_version["version_no"]
    return [vrsn_file_dest, vrsn_no]


for dir in packages_dir_list:
    path_to_package_json = os.path.join(top_level_directory, dir, "package.json")
    path_to_package_json_list.append(path_to_package_json)

for pkg_json_path in path_to_package_json_list:
    json_file = open(pkg_json_path)
    json_data = json.load(json_file)
    pkg_name_version_list.append(
        {"pkg_name": json_data["name"], "version_no": json_data["version"]}
    )
    json_file.close()

for dir in packages_dir_list:
    vrsn_file_dest, version_no = get_vrsn_file_from_dir_name(dir)
    if vrsn_file_dest is not None:
        with fileinput.FileInput(
            os.path.join(top_level_directory, dir, "src", vrsn_file_dest),
            inplace=True,
        ) as file:
            for line in file:
                strng_to_replace = 'token.versions["' + dir + '"]'
                if strng_to_replace in line:
                    replacement = line.replace(
                        line,
                        strng_to_replace + " = " + '"' + version_no + '"' + ";",
                        1,
                    )
                    print(str(replacement),end=" ")
                else:
                    print(line, end=" ")
            file.close()
