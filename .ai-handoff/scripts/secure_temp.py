#!/usr/bin/env python3
"""Fail-closed creation of protected runner-temp paths."""

import os
import stat
from pathlib import Path


def _absolute(path):
    value = Path(path)
    if not value.is_absolute():
        raise ValueError("secure temp paths must be absolute")
    return value


def _inside(path, root):
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"path must stay under protected temp root: {root}") from exc


def _reject_symlink_chain(path, stop):
    current = path
    chain = []
    while current != stop:
        chain.append(current)
        if current.parent == current:
            raise ValueError("protected temp root is not an ancestor")
        current = current.parent
    chain.append(stop)
    for candidate in reversed(chain):
        if not candidate.exists() and not candidate.is_symlink():
            continue
        mode = candidate.lstat().st_mode
        if stat.S_ISLNK(mode):
            raise ValueError(f"symlink is forbidden in protected temp path: {candidate}")
        if candidate != path and not stat.S_ISDIR(mode):
            raise ValueError(f"non-directory ancestor in protected temp path: {candidate}")


def secure_directory(path, allowed_root, mode=0o700):
    root = _absolute(allowed_root)
    target = _absolute(path)
    _inside(target, root)
    if not root.exists() or root.is_symlink() or not root.is_dir():
        raise ValueError("protected temp root must be an existing real directory")
    _reject_symlink_chain(target.parent, root)
    if target.exists() or target.is_symlink():
        raise FileExistsError(f"protected temp destination already exists: {target}")
    target.mkdir(parents=True, mode=mode)
    _reject_symlink_chain(target, root)
    os.chmod(target, mode)
    return target


def secure_write_bytes(path, data, allowed_root, mode=0o600):
    root = _absolute(allowed_root)
    target = _absolute(path)
    _inside(target, root)
    if not root.exists() or root.is_symlink() or not root.is_dir():
        raise ValueError("protected temp root must be an existing real directory")
    _reject_symlink_chain(target.parent, root)
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    _reject_symlink_chain(target.parent, root)
    if target.exists() or target.is_symlink():
        raise FileExistsError(f"protected temp output already exists: {target}")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = os.open(target, flags, mode)
    try:
        with os.fdopen(descriptor, "wb", closefd=False) as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
    finally:
        os.close(descriptor)
    os.chmod(target, mode)
    return target


def secure_write_text(path, text, allowed_root, mode=0o600):
    return secure_write_bytes(path, text.encode("utf-8"), allowed_root, mode)
