import React, { useState } from "react";

const API = "http://localhost:5000";

interface User {
  id: number;
  username: string;
}

interface Workspace {
  id: number;
  name: string;
  role: "Admin" | "Editor" | "Lector";
}

interface Project {
  id: number;
  name: string;
  description: string;
}

interface LoginResponse {
  user: User;
  workspaces: Workspace[];
  session_token: string;
}

interface TokenResponse {
  token: string;
  role: "Admin" | "Editor" | "Lector";
}

interface ProjectsResponse {
  projects: Project[];
}

interface ProjectResponse {
  project: Project;
}

interface ErrorResponse {
  error: string;
}

function App() {
  const [view, setView] = useState<"login" | "workspace" | "dashboard">("login");
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sessionToken, setSessionToken] = useState("");
  const [workspaceToken, setWorkspaceToken] = useState("");
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeRole, setActiveRole] = useState<"Admin" | "Editor" | "Lector" | "">("");
  const [projects, setProjects] = useState<Project[]>([]);

  async function handleLogin(username: string, password: string) {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data: LoginResponse & ErrorResponse = await res.json();
      if (!res.ok) {
        alert(data.error || "Error al iniciar sesión");
        return;
      }
      setUser(data.user);
      setWorkspaces(data.workspaces);
      setSessionToken(data.session_token);
      setView("workspace");
    } catch {
      alert("Error de conexión con el servidor");
    }
  }

  async function handleSelectWorkspace(workspaceId: number) {
    try {
      const res = await fetch(`${API}/api/auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const data: TokenResponse & ErrorResponse = await res.json();
      if (!res.ok) {
        alert(data.error || "Error al seleccionar workspace");
        return;
      }
      setWorkspaceToken(data.token);
      setActiveRole(data.role);
      const ws = workspaces.find((w) => w.id === workspaceId) || null;
      setActiveWorkspace(ws);
      await loadProjects(data.token);
      setView("dashboard");
    } catch {
      alert("Error de conexión con el servidor");
    }
  }

  async function loadProjects(token: string) {
    try {
      const res = await fetch(`${API}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: ProjectsResponse & ErrorResponse = await res.json();
      if (res.ok) {
        setProjects(data.projects);
      } else {
        alert(data.error || "Error al cargar proyectos");
      }
    } catch {
      alert("Error de conexión con el servidor");
    }
  }

  async function handleCreateProject() {
    const name = prompt("Nombre del proyecto:");
    if (!name) return;
    const description = prompt("Descripción (opcional):") || "";
    try {
      const res = await fetch(`${API}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${workspaceToken}`,
        },
        body: JSON.stringify({ name, description }),
      });
      const data: ProjectResponse & ErrorResponse = await res.json();
      if (!res.ok) {
        alert(data.error || "Error al crear proyecto");
        return;
      }
      setProjects([...projects, data.project]);
    } catch {
      alert("Error de conexión con el servidor");
    }
  }

  function handleLogout() {
    setUser(null);
    setWorkspaces([]);
    setSessionToken("");
    setWorkspaceToken("");
    setActiveWorkspace(null);
    setActiveRole("");
    setProjects([]);
    setView("login");
  }

  if (view === "login") {
    return <LoginView onLogin={handleLogin} />;
  }

  if (view === "workspace") {
    return (
      <WorkspaceView
        user={user}
        workspaces={workspaces}
        onSelect={handleSelectWorkspace}
      />
    );
  }

  return (
    <DashboardView
      workspace={activeWorkspace}
      role={activeRole}
      projects={projects}
      canCreate={activeRole === "Admin" || activeRole === "Editor"}
      onCreate={handleCreateProject}
      onRefresh={() => loadProjects(workspaceToken)}
      onLogout={handleLogout}
    />
  );
}

function LoginView({ onLogin }: { onLogin: (u: string, p: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onLogin(username, password);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Iniciar Sesión</h1>
        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button style={styles.button} type="submit">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}

function WorkspaceView({
  user,
  workspaces,
  onSelect,
}: {
  user: User | null;
  workspaces: Workspace[];
  onSelect: (id: number) => void;
}) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Seleccionar Workspace</h1>
        <p style={styles.text}>Bienvenido, {user?.username}</p>
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            style={styles.workspaceItem}
            onClick={() => onSelect(ws.id)}
          >
            <strong>{ws.name}</strong>
            <span style={styles.roleBadge}>{ws.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardView({
  workspace,
  role,
  projects,
  canCreate,
  onCreate,
  onRefresh,
  onLogout,
}: {
  workspace: Workspace | null;
  role: string;
  projects: Project[];
  canCreate: boolean;
  onCreate: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{workspace?.name}</h1>
            <span style={styles.roleBadge}>Rol: {role}</span>
          </div>
          <button style={styles.logoutBtn} onClick={onLogout}>
            Cerrar Sesión
          </button>
        </div>
        <div style={styles.toolbar}>
          {canCreate && (
            <button style={styles.createBtn} onClick={onCreate}>
              + Crear Proyecto
            </button>
          )}
          <button style={styles.refreshBtn} onClick={onRefresh}>
            Actualizar
          </button>
        </div>
        {projects.length === 0 ? (
          <p style={styles.text}>No hay proyectos en este workspace.</p>
        ) : (
          projects.map((p) => (
            <div key={p.id} style={styles.projectItem}>
              <h3 style={styles.projectName}>{p.name}</h3>
              <p style={styles.projectDesc}>{p.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f2f5",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: "2rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    minWidth: 360,
    maxWidth: 500,
    width: "90%",
  },
  title: {
    margin: "0 0 1rem",
    fontSize: "1.5rem",
    color: "#1a1a2e",
  },
  text: {
    color: "#555",
    marginBottom: "1rem",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    marginBottom: "0.75rem",
    border: "1px solid #ddd",
    borderRadius: 4,
    fontSize: "1rem",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "0.75rem",
    backgroundColor: "#4361ee",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: "1rem",
    cursor: "pointer",
  },
  workspaceItem: {
    padding: "1rem",
    marginBottom: "0.5rem",
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #e9ecef",
  },
  roleBadge: {
    fontSize: "0.8rem",
    padding: "0.25rem 0.5rem",
    borderRadius: 4,
    backgroundColor: "#e9ecef",
    color: "#495057",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
  },
  logoutBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "transparent",
    color: "#dc3545",
    border: "1px solid #dc3545",
    borderRadius: 4,
    cursor: "pointer",
  },
  toolbar: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  createBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "#2d6a4f",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  refreshBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "#4361ee",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  projectItem: {
    padding: "1rem",
    marginBottom: "0.5rem",
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    border: "1px solid #e9ecef",
  },
  projectName: {
    margin: "0 0 0.25rem",
    fontSize: "1.1rem",
    color: "#1a1a2e",
  },
  projectDesc: {
    margin: 0,
    color: "#6c757d",
    fontSize: "0.9rem",
  },
};

export default App;
