import { useState } from "react";
import { motion } from "framer-motion";

const API = "http://localhost:5000";

interface User { id: number; username: string }
interface Workspace { id: number; name: string; role: "Admin" | "Editor" | "Lector" }
interface Project { id: number; name: string; description: string }

type View = "login" | "workspace" | "dashboard";

function App() {
  const [view, setView] = useState<View>("login");
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sessionToken, setSessionToken] = useState("");
  const [workspaceToken, setWorkspaceToken] = useState("");
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeRole, setActiveRole] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");

  async function handleLogin(username: string, password: string) {
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setUser(data.user);
      setWorkspaces(data.workspaces);
      setSessionToken(data.session_token);
      setView("workspace");
    } catch { setError("Error de conexión"); }
  }

  async function handleSelectWorkspace(workspaceId: number) {
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setWorkspaceToken(data.token);
      setActiveRole(data.role);
      setActiveWorkspace(workspaces.find((w) => w.id === workspaceId) || null);
      await loadProjects(data.token);
      setView("dashboard");
    } catch { setError("Error de conexión"); }
  }

  async function loadProjects(token: string) {
    try {
      const res = await fetch(`${API}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setProjects(data.projects);
      else setError(data.error);
    } catch { setError("Error de conexión"); }
  }

  async function handleCreateProject() {
    const name = prompt("Nombre del proyecto:");
    if (!name) return;
    const description = prompt("Descripción:") || "";
    setError("");
    try {
      const res = await fetch(`${API}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${workspaceToken}`,
        },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setProjects([...projects, data.project]);
    } catch { setError("Error de conexión"); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {view === "login" && (
        <LoginView key="login" onLogin={handleLogin} error={error} />
      )}
      {view === "workspace" && (
        <WorkspaceView
          key="workspace"
          user={user}
          workspaces={workspaces}
          onSelect={handleSelectWorkspace}
          error={error}
        />
      )}
      {view === "dashboard" && (
        <DashboardView
          key="dashboard"
          workspace={activeWorkspace}
          role={activeRole}
          projects={projects}
          canCreate={activeRole === "Admin" || activeRole === "Editor"}
          onCreate={handleCreateProject}
          onRefresh={() => loadProjects(workspaceToken)}
          onLogout={() => {
            setUser(null);
            setWorkspaces([]);
            setSessionToken("");
            setWorkspaceToken("");
            setActiveWorkspace(null);
            setActiveRole("");
            setProjects([]);
            setError("");
            setView("login");
          }}
          error={error}
        />
      )}
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const staggerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

function LoginView({ onLogin, error }: { onLogin: (u: string, p: string) => void; error: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-md"
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-6"
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </motion.div>
        <h1 className="text-2xl font-bold text-white text-center mb-8">Iniciar Sesión</h1>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(username, password); }} className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1 block">Usuario</label>
            <input
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">Contraseña</label>
            <input
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2"
            >
              {error}
            </motion.p>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold shadow-lg hover:shadow-xl transition"
            type="submit"
          >
            Ingresar
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}

function WorkspaceView({ user, workspaces, onSelect, error }: { user: User | null; workspaces: Workspace[]; onSelect: (id: number) => void; error: string }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-md"
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold text-white text-center mb-2"
        >
          Seleccionar Workspace
        </motion.h1>
        <p className="text-white/60 text-center mb-6">Bienvenido, <span className="text-white font-semibold">{user?.username}</span></p>
        <motion.div
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {workspaces.map((ws) => (
            <motion.div
              key={ws.id}
              variants={itemVariants}
              whileHover={{ scale: 1.02, borderColor: "rgba(139,92,246,0.5)" }}
              whileTap={{ scale: 0.98 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer flex justify-between items-center transition group"
              onClick={() => onSelect(ws.id)}
            >
              <span className="text-white font-medium group-hover:text-violet-300 transition">{ws.name}</span>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                ws.role === "Admin" ? "bg-emerald-500/20 text-emerald-300" :
                ws.role === "Editor" ? "bg-blue-500/20 text-blue-300" :
                "bg-white/10 text-white/60"
              }`}>
                {ws.role}
              </span>
            </motion.div>
          ))}
        </motion.div>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm mt-4 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

function DashboardView({
  workspace, role, projects, canCreate, onCreate, onRefresh, onLogout, error,
}: {
  workspace: Workspace | null; role: string; projects: Project[];
  canCreate: boolean; onCreate: () => void; onRefresh: () => void;
  onLogout: () => void; error: string;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-2xl"
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold text-white"
            >
              {workspace?.name}
            </motion.h1>
            <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium mt-2 ${
              role === "Admin" ? "bg-emerald-500/20 text-emerald-300" :
              role === "Editor" ? "bg-blue-500/20 text-blue-300" :
              "bg-white/10 text-white/60"
            }`}>
              {role}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="px-4 py-2 rounded-xl border border-red-500/30 text-red-300 hover:bg-red-500/10 transition text-sm"
          >
            Cerrar Sesión
          </motion.button>
        </div>

        <div className="flex gap-3 mb-6">
          {canCreate && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCreate}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg"
            >
              + Crear Proyecto
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onRefresh}
            className="py-3 px-6 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition font-medium"
          >
            Actualizar
          </motion.button>
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm mb-4 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </motion.p>
        )}

        <motion.div
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {projects.length === 0 ? (
            <p className="text-white/40 text-center py-8">No hay proyectos en este workspace.</p>
          ) : (
            projects.map((p) => (
              <motion.div
                key={p.id}
                variants={itemVariants}
                whileHover={{ x: 4 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <h3 className="text-white font-semibold">{p.name}</h3>
                <p className="text-white/50 text-sm mt-1">{p.description}</p>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default App;
