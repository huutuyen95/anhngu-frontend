# Skills — Frontend (Anh ngữ)

| Thư mục | File | Dùng khi |
|---------|------|----------|
| `anhngu-frontend-ui-ux` | [SKILL.md](anhngu-frontend-ui-ux/SKILL.md) | UI/UX + Architecture (App Router, features, API layer) |

Skill backend nằm ở `backend/docs/skills/`.

## Cách bật trên máy (Cursor)

Từ root `anhngu-infra`:

```bash
mkdir -p .cursor/skills
ln -sfn ../../frontend/docs/skills/anhngu-frontend-ui-ux .cursor/skills/anhngu-frontend-ui-ux
ln -sfn ../../backend/docs/skills/anhngu-laravel-backend .cursor/skills/anhngu-laravel-backend
```

> **Nguồn thật** = `frontend/docs/skills/` (skill UI) và `backend/docs/skills/` (skill API). Sửa ở docs rồi commit trong submodule tương ứng.
