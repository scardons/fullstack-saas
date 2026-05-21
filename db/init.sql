CREATE TABLE users (id SERIAL PRIMARY KEY, username VARCHAR(50), password VARCHAR(255));
CREATE TABLE workspaces (id SERIAL PRIMARY KEY, name VARCHAR(50));
CREATE TABLE user_workspace_roles (id SERIAL PRIMARY KEY, user_id INT, workspace_id INT, role VARCHAR(10));
CREATE TABLE projects (id SERIAL PRIMARY KEY, workspace_id INT, name VARCHAR(100), description TEXT);

INSERT INTO users (username, password) VALUES ('testuser', 'testpassword');
INSERT INTO workspaces (name) VALUES ('Workspace Alfa'), ('Workspace Beta');
INSERT INTO user_workspace_roles (user_id, workspace_id, role) VALUES (1, 1, 'Admin'), (1, 2, 'Lector');
INSERT INTO projects (workspace_id, name, description) VALUES
(1, 'Proyecto Alfa 1', 'Descripción 1'),
(1, 'Proyecto Alfa 2', 'Descripción 2'),
(2, 'Proyecto Beta 1', 'Descripción 1'),
(2, 'Proyecto Beta 2', 'Descripción 2');