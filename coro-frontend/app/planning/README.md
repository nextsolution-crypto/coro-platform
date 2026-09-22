# Team Planner UI V1

The `/planning` route reads `/planning/team` for a five-day work week (or one day), and `/planning/actions` only when an action counter is opened. Dates, view, display zone, and filters are kept in the URL. The display zone changes grid coordinates and labels, never Booking instants. Work intervals paint the row background; events are positioned to the minute. The visible hour range expands beyond 07:00–19:00 when an event or work interval requires it.

The drawer uses the authorized Planning event projection. Generic colleague events and all unavailability events remain generic. Navigation links open existing Booking, Project, Client, Building, and Activity pages. V1 does not mutate Planning data.

This repository has no frontend component-test runner. `npm run test:planning` checks date/window math, minute positioning, labels, confidentiality guards, and the oversized-window message with Node's built-in test API. The production build verifies the route and TypeScript. Interactive browser coverage for loading, keyboard focus, and responsive layout remains for 2D.3.3.
