# ALVA SEARCH

Alva Search is a modern web-based search engine built with Angular that allows users to search for information on the internet. The application features a clean, user-friendly interface and is designed to provide efficient search results.

## Features

- Modern, responsive user interface
- Fast and efficient search capabilities
- Built with Angular 19
- Docker containerization support
- Nginx web server configuration

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (Latest LTS version recommended)
- Angular CLI (v19.2.5 or later)
- Docker (optional, for containerized deployment)

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd alva-search-view
```

2. Install dependencies:
```bash
npm install
```

## Development

To start the development server:

```bash
npm start
```

The application will be available at `http://localhost:4200`

## Building for Production

To build the application for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Docker Deployment

The project includes Docker support for easy deployment:

1. Build the Docker image:
```bash
docker build -t alva-search .
```

2. Run the container:
```bash
docker run -p 80:80 alva-search
```

## Testing

To run the test suite:

```bash
npm test
```

## Project Structure

- `src/` - Source code directory
- `public/` - Static assets
- `dist/` - Production build output
- `nginx.conf` - Nginx configuration for production deployment
- `Dockerfile` - Docker configuration for containerization

## Technologies Used

- Angular 19
- TypeScript
- RxJS
- Font Awesome
- Nginx
- Docker
