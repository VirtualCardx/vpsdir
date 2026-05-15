# Admin UI Cheat Sheet

This cheat sheet is a quick reference for building admin pages. Prefer the shared classes in `src/styles/global.css` instead of repeating one-off Tailwind utility combinations inside page templates.

## Core Principles

- Start new admin pages from an existing admin page structure, then replace fields and business logic
- Extend shared classes in `global.css` first, then reuse them in templates
- For small visual tweaks, update the shared class instead of patching pages one by one
- If a pattern can be reused by provider management, activity management, login, or settings, avoid treating it as page-specific

## Shared Components

| Component | Purpose |
| --- | --- |
| `AdminAlert` | Shared success / error alert wrapper |
| `AdminSectionCard` | Reusable admin card section |
| `AdminDataTable` | Shared admin table shell with overflow wrapper |
| `AdminHeaderActions` | Action area on the right side of the admin header |
| `AdminFormPage` | Standard `main + card + form` shell for admin form pages |

## Layout and Sections

| Class | Purpose |
| --- | --- |
| `admin-card` | Standard admin card container |
| `admin-section-header` | Header wrapper for a card section |
| `admin-section-title` | Card title |
| `admin-section-desc` | Description text below a card title |
| `admin-group-title` | Smaller section heading |

## Alerts and Empty States

| Class | Purpose |
| --- | --- |
| `admin-alert` | Base alert style |
| `admin-alert-success` | Success alert |
| `admin-alert-error` | Error alert |
| `admin-help-text` | Helper copy below inputs or editors |
| `admin-note-danger` | Red warning note |
| `admin-empty-state` | Regular empty-state text |
| `admin-empty-state-table` | Empty state inside tables |
| `admin-meta-text` | Small metadata text |

## Form Controls

| Class | Purpose |
| --- | --- |
| `admin-label` | Standard form label |
| `admin-input` | Shared input / select styling |
| `admin-checkbox-row` | Horizontal checkbox + label row |
| `admin-checkbox` | Checkbox styling |
| `admin-checkbox-label` | Checkbox label text |

## Buttons and Links

| Class | Purpose |
| --- | --- |
| `admin-btn` | Base button style |
| `admin-btn-sm` | Small button size |
| `admin-btn-primary` | Primary button |
| `admin-btn-accent` | Accent button |
| `admin-btn-secondary` | Secondary button |
| `admin-btn-link` | Link-like button |
| `admin-btn-danger` | Destructive action button |
| `admin-action-link` | Action link used inside lists |

## Tables and Status UI

| Class | Purpose |
| --- | --- |
| `admin-table-card` | Outer table card |
| `admin-table-wrap` | Horizontal scroll wrapper |
| `admin-table` | Base table styling |
| `admin-table-head` | Table header cell |
| `admin-cell` | Regular table cell |
| `admin-cell-muted` | Secondary text cell |
| `admin-cell-strong` | Strong text cell |
| `admin-badge` | Base badge |
| `admin-badge-muted` | Neutral badge |
| `admin-badge-success` | Success badge |
| `admin-badge-danger` | Danger badge |

## Uploads and Tag Pills

| Class | Purpose |
| --- | --- |
| `admin-upload-area` | Upload / drag-and-drop area |
| `admin-upload-text` | Main upload hint |
| `admin-upload-subtext` | Secondary upload hint |
| `admin-tag-pill` | Tag pill |
| `admin-tag-pill-remove` | Tag remove button |

## Text Helpers

| Class | Purpose |
| --- | --- |
| `admin-text-strong` | Strong text emphasis |
| `admin-text-muted` | Muted text |
| `admin-text-accent` | Accent-colored text |

## Recommended Patterns

### Standard Admin Form Card

```html
<section class="admin-card">
  <div class="admin-section-header">
    <h2 class="admin-section-title">Section title</h2>
    <p class="admin-section-desc">Supporting description</p>
  </div>

  <label class="admin-label">Field</label>
  <input class="admin-input" />

  <p class="admin-help-text">Helper text</p>

  <button class="admin-btn admin-btn-primary">Save</button>
</section>
```

### Admin Form Page With AdminFormPage

```astro
<AdminFormPage
  title="Page title"
  description="Supporting description"
  action="/api/example"
  formClass="space-y-4"
>
  <div>
    <label class="admin-label">Field</label>
    <input class="admin-input" />
  </div>

  <button class="admin-btn admin-btn-primary">Save</button>
</AdminFormPage>
```

If the current page already owns the `main.container` wrapper and the form is only one section among tables or other admin blocks, use:

```astro
<AdminFormPage title="Section title" wrapMain={false}>
  ...
</AdminFormPage>
```

### Admin Data Table With AdminDataTable

```astro
<AdminDataTable
  headClass="bg-gray-50 border-b border-gray-200"
  bodyClass="divide-y divide-gray-100"
>
  <Fragment slot="head">
    <tr>
      <th class="admin-table-head">Title</th>
    </tr>
  </Fragment>

  <tr>
    <td class="admin-cell">Content</td>
  </tr>
</AdminDataTable>
```

## Maintenance Notes

- If the same `class` combination starts appearing repeatedly, move it into `global.css`
- If a UI pattern appears in two admin pages, it is usually worth extracting
- Theme color, spacing, radius, and border changes should usually start from shared classes and CSS variables
