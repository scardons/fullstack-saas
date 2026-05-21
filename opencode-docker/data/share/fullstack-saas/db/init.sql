CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE user_workspace_roles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    workspace_id INT NOT NULL REFERENCES workspaces(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Editor', 'Lector')),
    UNIQUE(user_id, workspace_id)
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    workspace_id INT NOT NULL REFERENCES workspaces(id),
    name VARCHAR(200) NOT NULL,
    description TEXT
);

INSERT INTO users (username, password_hash) VALUES
    ('testuser', '9f735e0df9a1ddc702bf0a1a7b83033f9f7153a00c29de82cedadc9957289b05');

INSERT INTO workspaces (name) VALUES
    ('Workspace Alfa'),
    ('Workspace Beta');

INSERT INTO user_workspace_roles (user_id, workspace_id, role) VALUES
    (1, 1, 'Admin'),
    (1, 2, 'Lector');

INSERT INTO projects (workspace_id, name, description) VALUES
    (1, 'Proyecto Alfa 1', 'Primer proyecto en Workspace Alfa'),
    (1, 'Proyecto Alfa 2', 'Segundo proyecto en Workspace Alfa'),
    (2, 'Proyecto Beta 1', 'Primer proyecto en Workspace Beta'),
    (2, 'Proyecto Beta 2', 'Segundo proyecto en Workspace Beta');
