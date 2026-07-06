# Dead Code Report

## Scope
This audit reviewed the React frontend, the routing graph, the shared hooks/services, and the PHP API files under the current workspace.

## Findings Summary
No clearly unused React components, pages, hooks, services, or PHP endpoint files were found based on the current import and route usage.

The main cleanup opportunity is duplication rather than outright dead code.

## Unused React Components

| File | Reason | Safe To Remove? |
|---|---|---|
| None found | All component files in the React UI are referenced by pages or the app shell. | No |

## Unused Pages

| File | Reason | Safe To Remove? |
|---|---|---|
| None found | All page modules are mounted through the router in App.tsx. | No |

## Unused Hooks

| File | Reason | Safe To Remove? |
|---|---|---|
| None found | The hook modules are used by the app shell and by multiple pages/components. | No |

## Unused Services / Shared Modules

| File | Reason | Safe To Remove? |
|---|---|---|
| None found | Shared modules such as the API client, auth context, cart context, and settings helpers are actively used by the UI. | No |

## Unused PHP Files

| File | Reason | Safe To Remove? |
|---|---|---|
| None found | All PHP endpoint files are referenced by the frontend or are required by the shared bootstrap/auth layer. | No |

## Duplicate Code / Refactoring Candidates

| File | Reason | Safe To Remove? |
|---|---|---|
| [src/pages/admin/AdminProducts.tsx](src/pages/admin/AdminProducts.tsx) | Repeats the same CRUD list/save/delete/error-handling pattern seen in the other admin management pages. | No |
| [src/pages/admin/AdminCategories.tsx](src/pages/admin/AdminCategories.tsx) | Shares nearly identical CRUD flow and form handling with the other admin pages. | No |
| [src/pages/admin/AdminBanners.tsx](src/pages/admin/AdminBanners.tsx) | Uses the same admin CRUD structure and toast/error handling as the other admin modules. | No |
| [src/pages/admin/AdminCustomers.tsx](src/pages/admin/AdminCustomers.tsx) | Contains a repeated list/toggle/delete flow that is structurally similar to other admin pages. | No |
| [src/pages/admin/AdminReviews.tsx](src/pages/admin/AdminReviews.tsx) | Repeats the same fetch/list/action pattern as the other admin management screens. | No |
| [api/v1/products.php](api/v1/products.php) | Implements CRUD logic with the same validation and response patterns used by categories, banners, delivery, and customers. | No |
| [api/v1/categories.php](api/v1/categories.php) | Mirrors the same CRUD shape and validation flow as products and banners. | No |
| [api/v1/banners.php](api/v1/banners.php) | Uses the same create/update/delete structure as the other CRUD endpoints. | No |
| [api/v1/customers.php](api/v1/customers.php) | Contains repeated address/customer CRUD logic that could be modularized. | No |
| [api/v1/orders.php](api/v1/orders.php) | Has a large amount of branching and repeated input validation that could be split into helpers. | No |

## Notes
- The front-end router in [src/App.tsx](src/App.tsx) imports every visible page route, so those pages are not dead.
- The PHP bootstrap and shared includes in [api/bootstrap.php](api/bootstrap.php) and [api/includes/auth.php](api/includes/auth.php) are active runtime dependencies, so the endpoint files are not unused.
- The strongest maintenance improvement would be to extract a reusable admin CRUD pattern and a shared PHP CRUD helper layer rather than remove files.
