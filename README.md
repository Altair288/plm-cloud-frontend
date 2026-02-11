# PLM Cloud Frontend (Next.js Refactor)

This project is the frontend for the PLM (Product Lifecycle Management) Cloud Platform, recently refactored from a Vite-based SPA to a modern **Next.js 15** application using the **App Router**. It integrates **Ant Design 5** and **ECharts** to provide a robust, enterprise-grade user interface.

## Key Features

- **Next.js 15 & App Router**: Utilizes the latest React Server Components (RSC) architecture and file-system based routing for improved performance and SEO.
- **Ant Design 5**: Built with the latest version of Ant Design, featuring a flexible design system and comprehensive component library.
- **ProComponents**: Leverages `@ant-design/pro-components` (ProLayout, ProTable, ProCard) for rapid development of admin interfaces.
- **Interactive Charts**: Integrated with **ECharts** for powerful data visualization and analytics.
- **TypeScript**: Fully typed codebase for better developer experience and code quality.
- **Responsive Design**: Adaptive layouts that work seamlessly across different screen sizes.

## Project Structure

```text
src/
  app/                 # Next.js App Router directory
    (auth)/            # Route group for authentication (Login, Register)
    (main)/            # Route group for main application (Dashboard, Products, etc.)
    layout.tsx         # Root layout with AntdRegistry
    page.tsx           # Root page (redirects to dashboard)
    globals.css        # Global styles
  assets/              # Static assets (images, SVGs)
  components/          # Shared UI components
  config/              # Global configurations and constants
  hooks/               # Custom React Hooks
  layouts/             # Layout components (e.g., UnifiedLayout)
  models/              # TypeScript interfaces and domain models
  services/            # API services and Axios setup
  styles/              # Theme configuration and color palettes
  utils/               # Utility functions
  middleware.ts        # Next.js middleware (optional)
  features/
    category/          # Shared category tree UI (used by both main and admin)
  app/(admin)/admin/category/ # Admin category page currently uses pure tree view; backend data wiring pending
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Altair288/plm-cloud-frontend.git
    cd plm-cloud-frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Local backend proxy (fix for `/api` calls)

- This project reads the backend base URL from the environment variable `NEXT_PUBLIC_API_BASE_URL`.
- For local development, create a `.env.local` in the project root (this file is already added) or set the env var before starting the dev server.

Example `.env.local` (already present):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

After editing/adding `.env.local`, restart the dev server (`npm run dev`) so `next` picks up the environment.

### Build for Production

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Configuration

The application uses environment variables for configuration. Create a `.env` or `.env.local` file in the root directory:

```dotenv
# Base URL for the backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Library**: [Ant Design 6](https://ant.design/)
- **Pro Components**: [Ant Design Pro Components](https://procomponents.ant.design/)
- **Charting**: [Apache ECharts](https://echarts.apache.org/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Icons**: [Ant Design Icons](https://ant.design/components/icon)

## License

This project is licensed under the MIT License.
