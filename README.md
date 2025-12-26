# PLM Cloud Frontend (Next.js Refactor)

This project is the frontend for the PLM (Product Lifecycle Management) Cloud Platform, recently refactored from a Vite-based SPA to a modern **Next.js 15** application using the **App Router**. It integrates **Ant Design 5** and **ECharts** to provide a robust, enterprise-grade user interface.

## 🚀 Key Features

- **Next.js 15 & App Router**: Utilizes the latest React Server Components (RSC) architecture and file-system based routing for improved performance and SEO.
- **Ant Design 5**: Built with the latest version of Ant Design, featuring a flexible design system and comprehensive component library.
- **ProComponents**: Leverages `@ant-design/pro-components` (ProLayout, ProTable, ProCard) for rapid development of admin interfaces.
- **Interactive Charts**: Integrated with **ECharts** for powerful data visualization and analytics.
- **TypeScript**: Fully typed codebase for better developer experience and code quality.
- **Responsive Design**: Adaptive layouts that work seamlessly across different screen sizes.

## 📂 Project Structure

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
  layouts/             # Layout components (e.g., BasicLayout)
  models/              # TypeScript interfaces and domain models
  services/            # API services and Axios setup
  styles/              # Theme configuration and color palettes
  utils/               # Utility functions
  middleware.ts        # Next.js middleware (optional)
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn

### Installation

1.  Clone the repository and switch to the refactored branch:
    ```bash
    git clone https://github.com/Altair288/plm-cloud-frontend.git
    cd plm-cloud-frontend
    git checkout refactor/nextjs
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

### Build for Production

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## ⚙️ Configuration

The application uses environment variables for configuration. Create a `.env` or `.env.local` file in the root directory:

```dotenv
# Base URL for the backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## 🧩 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Library**: [Ant Design 5](https://ant.design/)
- **Pro Components**: [Ant Design Pro Components](https://procomponents.ant.design/)
- **Charting**: [Apache ECharts](https://echarts.apache.org/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Icons**: [Ant Design Icons](https://ant.design/components/icon)

## 📝 License

This project is licensed under the MIT License.
