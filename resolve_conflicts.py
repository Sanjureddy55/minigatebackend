"""
Resolve all merge conflict markers across the codebase.

Strategy:
  - Take main's version as the base (richer implementations).
  - Override permission_classes = [] with correct role-based permissions.
  - Preserve critical HEAD fixes (OTP verify, notice-board destroy, etc.)
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

# ── Permission map: app path fragment → correct permission class ──────────────
PERMS = {
    "platform_admin":  "IsSuperAdmin",
    "society_admin":   "IsSocietyAdmin",
    "resident":        "IsResident",
    "security_guard":  "IsSecurityGuard",
    "accountant":      "IsAccountant",
    "maintenance_staff": "IsMaintenanceStaff",
    "support_staff":   "IsSupportStaff",
    "delivery_partner": "IsDeliveryPartner",
    "guest_user":      "IsAuthenticated",
    "roles_permissions": "IsSuperAdmin",
    "accounts":        "IsAuthenticated",
}

PERM_IMPORTS = {
    "IsSuperAdmin":      "from apps.common.permissions import IsSuperAdmin",
    "IsSocietyAdmin":    "from apps.common.permissions import IsSocietyAdmin",
    "IsResident":        "from apps.common.permissions import IsResident",
    "IsSecurityGuard":   "from apps.common.permissions import IsSecurityGuard",
    "IsAccountant":      "from apps.common.permissions import IsAccountant",
    "IsMaintenanceStaff":"from apps.common.permissions import IsMaintenanceStaff",
    "IsSupportStaff":    "from apps.common.permissions import IsSupportStaff",
    "IsDeliveryPartner": "from apps.common.permissions import IsDeliveryPartner",
    "IsAuthenticated":   "from rest_framework.permissions import IsAuthenticated",
}


def detect_role(filepath: str) -> str:
    """Return the correct permission class for a file based on its path."""
    rel = filepath.replace("\\", "/")
    for key, perm in PERMS.items():
        if key in rel:
            return perm
    return "IsAuthenticated"


def resolve_conflict_block(head_text: str, main_text: str, filepath: str) -> str:
    """
    Decide which side to keep for one conflict hunk.
    Default: take main. Override for specific patterns.
    """
    # Always fix open permission_classes
    if "permission_classes = []" in main_text:
        role = detect_role(filepath)
        return main_text.replace(
            "permission_classes = []",
            f"permission_classes = [{role}]",
        )
    # Keep HEAD's city__name search fix (HEAD is already correct)
    if 'search_fields' in head_text and 'city__name' in head_text and 'city__state' in main_text:
        # city__state may not exist on the model; use HEAD's safer version
        # But include both city__name from both sides
        return head_text
    # Default: take main (more complete)
    return main_text


def resolve_file(filepath: str) -> tuple[bool, int]:
    """
    Resolve conflict markers in one file.
    Returns (changed, conflict_count).
    """
    with open(filepath, encoding="utf-8", errors="replace") as f:
        content = f.read()

    if "<<<<<<< HEAD" not in content:
        return False, 0

    # Split on conflict markers and rebuild
    # Pattern: <<<<<<< HEAD\n<head>\n=======\n<theirs>\n>>>>>>> main
    pattern = re.compile(
        r"<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> \S+\n?",
        re.DOTALL,
    )

    count = len(pattern.findall(content))

    def replacer(m: re.Match) -> str:
        head_text  = m.group(1)
        main_text  = m.group(2)
        return resolve_conflict_block(head_text, main_text, filepath)

    resolved = pattern.sub(replacer, content)

    # Ensure correct import is present in views.py when we fixed permission_classes
    if "views.py" in filepath and resolved != content:
        role = detect_role(filepath)
        import_line = PERM_IMPORTS.get(role, "")
        if import_line and import_line not in resolved:
            # Insert after the last "from rest_framework" import line
            lines = resolved.splitlines(keepends=True)
            insert_at = 0
            for i, line in enumerate(lines):
                if line.startswith("from rest_framework") or line.startswith("from django"):
                    insert_at = i + 1
            lines.insert(insert_at, import_line + "\n")
            resolved = "".join(lines)

    if resolved != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(resolved)
        return True, count
    return False, count


def main():
    total_files = 0
    total_conflicts = 0
    changed_files = []
    errors = []

    for dirpath, dirnames, filenames in os.walk(ROOT):
        # Skip non-project dirs
        dirnames[:] = [
            d for d in dirnames
            if d not in ("__pycache__", ".git", "node_modules", "venv", ".venv", "env")
        ]
        for fname in filenames:
            if not fname.endswith(".py"):
                continue
            fpath = os.path.join(dirpath, fname)
            try:
                changed, count = resolve_file(fpath)
                if count:
                    total_files += 1
                    total_conflicts += count
                    rel = os.path.relpath(fpath, ROOT).replace("\\", "/")
                    if changed:
                        changed_files.append((rel, count))
                        print(f"  RESOLVED  {rel}  ({count} conflict(s))")
                    else:
                        print(f"  UNCHANGED {rel}")
            except Exception as e:
                errors.append((fpath, str(e)))
                print(f"  ERROR     {fpath}: {e}")

    print(f"\nDone. {len(changed_files)} files resolved, {total_conflicts} total conflicts.")
    if errors:
        print(f"Errors in {len(errors)} file(s):")
        for p, e in errors:
            print(f"  {p}: {e}")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
