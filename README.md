# Lexica Backend

This repository contains the backend code for Lexica, a tool designed to facilitate micro edits to Lexemes on Wikidata. The backend handles user authentication, session management, and interactions with the Wikidata API for editing Lexemes.

## Features
- User authentication using OAuth 2.0.
- Session management and secure storage of editing results.
- Integration with Wikidata API for fetching and editing Lexeme data.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/lexica-backend.git
   cd lexica-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with `.env.example` variables

4. Database migration
   ```bash
   npx sequelize-cli db:migrate 
   ```

5. Database seeder
   ```bash
   npx sequelize-cli db:seed:all 
   ```

6. Running the Application:
   ### Development Mode
   ```bash
   npm start
   ```
   ### PM2 Build (optional)
   ```bash

   # Build server
   npm run build-server
   ```bash
   npm start
   ```


## Project Structure

```
lexica-backend/
├── app/
│   ├── bin/               # Server startup scripts
│   ├── configs/           # Configuration files
│   ├── controllers/       # Request handlers
│   ├── docs/              # API documentation
│   ├── middlewares/       # Express middleware
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   └── app.js             # Main application file
├── build/                 # Compiled code
├── public/                # Static files
└── package.json
```

### Key Components

### Controller
Purpose: Handles the logic for incoming requests.
Role: Acts as the middle layer between the model (database) and the route.
Example: If a user sends a request to /users, the controller decides what to do, like fetching all users from the database and sending the response.

### Middleware
Purpose: Functions that run before the controller logic.
Role: Can modify the request/response objects, or end the request-response cycle.
Use Cases: Authentication, logging, error handling, etc.

### Model
Purpose: Represents a table in the database.
Role: Defines the structure of data and interacts with the database.

- `User.js` - User authentication and profile management
- `Language.js` - Language definitions and metadata
- `Activity.js` - Activity master data
- `Contribution.js` - Base contribution model
- `ContributionHyphenationDetail.js` - Hyphenation-specific contributions
- `ContributionScriptDetail.js` - Script-specific contributions
- `ContributionConnectDetail.js` - Connection-specific contributions
- `LanguageVariant.js` - Language variant definitions
- `LanguageActivity.js` - Language-specific activity tracking

### Migration
Purpose: Used to create, modify, or delete tables in the database.
Role: Provides version control for database schema.
Tool: Sequelize CLI is commonly used to run migrations.

### Seeder
Purpose: Used to insert sample or default data into the database.
Role: Helps populate tables with initial data for testing or development.

#### Routes
The routes/ folder is where you organize all your route definitions in an Express app. Instead of writing all routes directly in app.js or index.js, you create separate files in the routes/ folder for cleaner, modular, and maintainable code.

- `/api/v1` - Main API endpoints
- `/api/docs` - Swagger API documentation

## API Documentation

Access the API documentation at `/api/docs` when the server is running. The documentation is powered by Swagger UI and provides detailed information about:
- Available endpoints
- Request/response formats
- Authentication requirements
- Example requests

## Error Handling

The application implements a comprehensive error handling system:

1. Global Error Handler
```javascript
app.use((err, req, res) => {
  res.status(err.status).json({
    message: 'Something Went Terribly Wrong on Our Side :(',
    requested_url: req.Path,
  });
});
```

2. 404 Handler
```javascript
app.use((req, res) => {
  res.status(404).json({
    message: 'Not Found',
    requested_url: req.Path,
  });
});
```

## Logging

The application uses multiple logging mechanisms:

1. HTTP Request Logging (Morgan)
```javascript
app.use(Morgan('dev'));
```

## Dependencies

### Core Dependencies
- `express` - Web framework
- `sequelize` - ORM for database operations
- `mysql2` - MySQL database driver
- `jsonwebtoken` - JWT authentication
- `cors` - Cross-origin resource sharing
- `swagger-ui-express` - API documentation

### Development Dependencies
- `@babel/core` - JavaScript compiler
- `nodemon` - Development server
- `mocha` - Testing framework
- `eslint` - Code linting
- `pm2` - Process manager