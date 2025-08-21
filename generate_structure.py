from pathlib import Path


def generate_tree_structure(root_dir, ignore_dirs=None, ignore_files=None):
    if ignore_dirs is None:
        ignore_dirs = []
    if ignore_files is None:
        ignore_files = [
            "*.pyc",
            ".DS_Store",
            "generate_structure.py",
            "scheme.txt",
            "design.txt",
        ]

    root_path = Path(root_dir)
    lines = []

    def build_tree(path, prefix=""):
        if path.name in ignore_dirs:
            return

        # 获取所有项并排序（文件夹优先）
        items = sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name))

        for index, item in enumerate(items):
            if any(item.match(pattern) for pattern in ignore_files):
                continue
            if item.name in ignore_dirs:
                continue

            connector = "└── " if index == len(items) - 1 else "├── "
            next_prefix = "    " if index == len(items) - 1 else "│   "

            lines.append(f"{prefix}{connector}{item.name}")

            if item.is_dir():
                build_tree(item, prefix + next_prefix)

    lines.append(f"/{root_path.name}")
    build_tree(root_path)
    return "\n".join(lines)


# 生成结构
structure = generate_tree_structure(".")
with open("scheme.txt", "w") as f:
    print(structure, file=f)
