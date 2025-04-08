# SecretBox

SecretBox is an anonymous messaging platform that allows users to receive anonymous messages without revealing their identity. Users can create a unique username, and others can send them anonymous messages. The platform features password protection, inbox management, and automatic message and box deletions.

## Features

- **User Registration**: Users can create a unique box with a username and password.
- **Anonymous Messaging**: Send messages anonymously to a user's box.
- **Inbox Management**: Users can view received messages in a paginated inbox.
- **Password Protection**: Boxes are password-protected for secure access.
- **Message Deletion**: Messages are automatically deleted after 30 minutes.
- **Box Deletion**: Boxes are automatically deleted after 24 hours of inactivity.
- **Pagination**: Display messages in a paginated format.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: bcrypt for password hashing
- **Cron Jobs**: Used for automatic message and box deletion
- **Templating Engine**: EJS for rendering views

## Getting Started

### Prerequisites

- **Node.js**: [Download Node.js](https://nodejs.org/)
- **PostgreSQL**: [Download PostgreSQL](https://www.postgresql.org/)

<p align="center"> <img src="https://img.shields.io/badge/Node.js-v16-green" alt="Node.js version"> <img src="https://img.shields.io/badge/PostgreSQL-v13-blue" alt="PostgreSQL version"> <img src="https://img.shields.io/badge/Express.js-v4-blue" alt="Express.js version"> </p>

### Installation

Clone the repository:

   ```bash
   git clone https://github.com/devFiend/secretbox.git
   cd secretbox

   Install dependencies: npm install
   npm start
    Go to http://localhost:3000.

```