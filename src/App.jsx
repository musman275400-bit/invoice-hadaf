import { useEffect, useState } from "react";

const COLLEGE = "Hadaf College";
const DEPARTMENTS = { BSCS: [], "BS English": [], "BS AHS": ["Cardiology", "Radiology", "Health"] };
const KEY = "admission-invoices-v3";
const today = () => new Date().toISOString().slice(0, 10);
const num = (v) => Number(v) || 0;
const pkr = (n) => "Rs. " + num(n).toLocaleString("en-PK");

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

const blank = (no) => ({
  admissionNo: no, date: today(), department: "BSCS", program: "",
  studentName: "", phone: "", fatherName: "",
  admissionFee: "", registrationFee: "", semesterFee: "10000",
  discount: "", paid: "",
});

const subtotal = (x) => num(x.admissionFee) + num(x.registrationFee) + num(x.semesterFee);
const discountAmt = (x) => Math.round((num(x.semesterFee) * num(x.discount)) / 100);
const total = (x) => subtotal(x) - discountAmt(x);
const balance = (x) => total(x) - num(x.paid);
const PASS_HASH = "99a2a6a7d8213c6b043b6e7de108680f6d0b5e57045e57e0976c914e28b117bf";
const sha256 = async (s) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

function Login({ onOk }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if ((await sha256(pw)) === PASS_HASH) {
      sessionStorage.setItem("auth", "1");
      onOk();
    } else {
      setErr("Password galat hai");
    }
  };
  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <h1>{COLLEGE}</h1>
        <p>Admission Invoice Login</p>
        <label>Password
          <input type="password" value={pw} autoFocus onChange={(e) => { setPw(e.target.value); setErr(""); }} />
        </label>
        {err && <div className="err">{err}</div>}
        <button className="primary" type="submit">Login</button>
      </form>
    </div>
  );
}

function Receipt({ view, label }) {
  return (
    <div className="copy">
      <p className="print-only copy-label">{label}</p>
      <h2>{COLLEGE} — BS Programs</h2>
      <p className="sub">Admission Invoice</p>
      <dl>
        <dt>Admission No</dt><dd>{view.admissionNo}</dd>
        <dt>Date</dt><dd>{view.date}</dd>
        <dt>Department</dt><dd>{view.department}{view.program ? ` (${view.program})` : ""}</dd>
        <dt>Student</dt><dd>{view.studentName}</dd>
        <dt>Father</dt><dd>{view.fatherName || "-"}</dd>
        <dt>Phone</dt><dd>{view.phone || "-"}</dd>
      </dl>
      <table>
        <tbody>
          <tr><td>Admission Fee</td><td>{pkr(view.admissionFee)}</td></tr>
          <tr><td>Registration Fee</td><td>{pkr(view.registrationFee)}</td></tr>
          <tr><td>Semester Fee</td><td>{pkr(view.semesterFee)}</td></tr>
          <tr><td>Percentage ({num(view.discount)}% on Semester Fee)</td><td>- {pkr(discountAmt(view))}</td></tr>
          <tr className="strong"><td>Total</td><td>{pkr(total(view))}</td></tr>
          <tr><td>Paid</td><td>{pkr(view.paid)}</td></tr>
          <tr className="strong"><td>Balance</td><td>{pkr(balance(view))}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function Invoices({ onLogout }) {
  const [list, setList] = useState(load);
  const [f, setF] = useState(() => blank(String(load().length + 1).padStart(4, "0")));
  const [view, setView] = useState(null);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} }, [list]);

  const set = (k) => (e) => {
    const v = e.target.value;
    setF((p) => ({ ...p, [k]: v, ...(k === "department" ? { program: "" } : {}) }));
  };

  const save = (e) => {
    e.preventDefault();
    if (!f.studentName.trim()) return alert("Student name likhein");
    if (DEPARTMENTS[f.department].length && !f.program) return alert("Program select karein");
    const inv = { ...f, total: total(f), balance: balance(f) };
    const updated = [...list, inv];
    setList(updated);
    setView(inv);
    setF(blank(String(updated.length + 1).padStart(4, "0")));
  };

  const remove = (no) => {
    if (confirm("Is invoice ko delete karna hai?")) setList(list.filter((i) => i.admissionNo !== no));
  };

  return (
    <div className="page">
   <header className="top">
  <div>
    <h1>{COLLEGE} <span>BS Programs</span></h1>
    <p>Admission Invoice</p>
  </div>
  <button className="noprint" onClick={onLogout}>Logout</button>
</header>


      <main className="grid">
        <form className="sheet" onSubmit={save}>
          <div className="row three">
            <label>Admission No<input value={f.admissionNo} onChange={set("admissionNo")} /></label>
            <label>Date<input type="date" value={f.date} onChange={set("date")} /></label>
            <label>Department
              <select value={f.department} onChange={set("department")}>
                {Object.keys(DEPARTMENTS).map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
          </div>

          {DEPARTMENTS[f.department].length > 0 && (
            <div className="row">
              <label>Program ({f.department})
                <select value={f.program} onChange={set("program")}>
                  <option value="">-- Select --</option>
                  {DEPARTMENTS[f.department].map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
            </div>
          )}

          <div className="row two">
            <label>Student Name<input value={f.studentName} onChange={set("studentName")} /></label>
            <label>Phone<input type="tel" value={f.phone} onChange={set("phone")} placeholder="03XX-XXXXXXX" /></label>
          </div>
          <div className="row">
            <label>Father Name<input value={f.fatherName} onChange={set("fatherName")} /></label>
          </div>

          <div className="fees">
            <label>Admission Fee<input type="number" min="0" value={f.admissionFee} onChange={set("admissionFee")} /></label>
            <label>Registration Fee<input type="number" min="0" value={f.registrationFee} onChange={set("registrationFee")} /></label>
            <label>Semester Fee<input type="number" min="0" value={f.semesterFee} onChange={set("semesterFee")} /></label>
            <label>Percentage (Semester Fee par)
              <select value={f.discount} onChange={set("discount")}>
                <option value="">No Percentage</option>
                {[10, 20, 30, 40, 50].map((p) => <option key={p} value={p}>{p}%</option>)}
              </select>
            </label>
            <label>Paid Now<input type="number" min="0" value={f.paid} onChange={set("paid")} /></label>
          </div>

          <div className="totals">
            <div><span>Percentage ({num(f.discount)}% on Semester Fee)</span><b>- {pkr(discountAmt(f))}</b></div>
            <div><span>Total</span><b>{pkr(total(f))}</b></div>
            <div><span>Balance</span><b className={balance(f) > 0 ? "due" : ""}>{pkr(balance(f))}</b></div>
          </div>

          <button className="primary" type="submit">Save invoice</button>
        </form>

        <section className="list">
          <h2>Saved invoices ({list.length})</h2>
          {list.length === 0 && <p className="empty">Abhi koi invoice nahi. Form bhar kar Save karein.</p>}
          {[...list].reverse().map((i) => (
            <div className="item" key={i.admissionNo}>
              <div>
                <b>{i.studentName}</b>
                <small>#{i.admissionNo} · {i.department}{i.program ? ` / ${i.program}` : ""} · {i.date}</small>
              </div>
              <div className="acts">
                <span className={i.balance > 0 ? "due" : "ok"}>{pkr(i.total)}</span>
                <button onClick={() => setView(i)}>View</button>
                <button className="ghost" onClick={() => remove(i.admissionNo)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      </main>

      {view && (
        <div className="overlay" onClick={() => setView(null)}>
          <div className="receipt" onClick={(e) => e.stopPropagation()}>
            <Receipt view={view} label="College Copy" />
            <div className="print-only cut">
              <Receipt view={view} label="Student Copy" />
            </div>
            <div className="noprint btns">
              <button className="primary" onClick={() => window.print()}>Print (2 copies)</button>
              <button onClick={() => setView(null)}>Close</button>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default function App() {
  const [ok, setOk] = useState(() => sessionStorage.getItem("auth") === "1");
  const logout = () => { sessionStorage.removeItem("auth"); setOk(false); };
  return ok ? <Invoices onLogout={logout} /> : <Login onOk={() => setOk(true)} />;
}