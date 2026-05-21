import os
import hashlib
from datetime import datetime, timedelta

import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/saas")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")


def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def require_auth(f):
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Token requerido"}), 401
        token = auth.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido"}), 401
        return f(payload, *args, **kwargs)

    wrapper.__name__ = f.__name__
    return wrapper


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Datos requeridos"}), 400

    username = data.get("username", "")
    password = data.get("password", "")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, username, password_hash FROM users WHERE username = %s",
        (username,),
    )
    user = cur.fetchone()

    if not user or user["password_hash"] != hash_password(password):
        cur.close()
        conn.close()
        return jsonify({"error": "Credenciales inválidas"}), 401

    cur.execute(
        """SELECT w.id, w.name, uwr.role
           FROM workspaces w
           JOIN user_workspace_roles uwr ON uwr.workspace_id = w.id
           WHERE uwr.user_id = %s""",
        (user["id"],),
    )
    workspaces = cur.fetchall()
    cur.close()
    conn.close()

    session_token = jwt.encode(
        {
            "user_id": user["id"],
            "username": user["username"],
            "type": "session",
            "exp": datetime.utcnow() + timedelta(hours=1),
        },
        SECRET_KEY,
        algorithm="HS256",
    )

    return jsonify(
        {
            "user": {"id": user["id"], "username": user["username"]},
            "workspaces": [
                {"id": w["id"], "name": w["name"], "role": w["role"]}
                for w in workspaces
            ],
            "session_token": session_token,
        }
    )


@app.route("/api/auth/token", methods=["POST"])
@require_auth
def exchange_token(payload):
    if payload.get("type") != "session":
        return jsonify({"error": "Token de sesión requerido"}), 400

    data = request.get_json()
    if not data or "workspace_id" not in data:
        return jsonify({"error": "workspace_id requerido"}), 400

    workspace_id = data["workspace_id"]
    user_id = payload["user_id"]

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """SELECT role FROM user_workspace_roles
           WHERE user_id = %s AND workspace_id = %s""",
        (user_id, workspace_id),
    )
    role_row = cur.fetchone()

    if not role_row:
        cur.close()
        conn.close()
        return jsonify({"error": "Acceso denegado a este workspace"}), 403

    role = role_row["role"]
    cur.close()
    conn.close()

    workspace_token = jwt.encode(
        {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "role": role,
            "type": "workspace",
            "exp": datetime.utcnow() + timedelta(hours=24),
        },
        SECRET_KEY,
        algorithm="HS256",
    )

    return jsonify({"token": workspace_token, "role": role})


@app.route("/api/projects", methods=["GET"])
@require_auth
def list_projects(payload):
    if payload.get("type") != "workspace":
        return jsonify({"error": "Token de workspace requerido"}), 400

    workspace_id = payload["workspace_id"]

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, description FROM projects WHERE workspace_id = %s ORDER BY id",
        (workspace_id,),
    )
    projects = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify(
        {
            "projects": [
                {"id": p["id"], "name": p["name"], "description": p["description"]}
                for p in projects
            ]
        }
    )


@app.route("/api/projects", methods=["POST"])
@require_auth
def create_project(payload):
    if payload.get("type") != "workspace":
        return jsonify({"error": "Token de workspace requerido"}), 400

    role = payload["role"]
    if role not in ("Admin", "Editor"):
        return jsonify({"error": "No tienes permiso para crear proyectos"}), 403

    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Nombre del proyecto requerido"}), 400

    workspace_id = payload["workspace_id"]
    name = data["name"]
    description = data.get("description", "")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO projects (workspace_id, name, description) VALUES (%s, %s, %s) RETURNING id, name, description",
        (workspace_id, name, description),
    )
    project = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return jsonify(
        {
            "project": {
                "id": project["id"],
                "name": project["name"],
                "description": project["description"],
            }
        }
    ), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
