import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import api from "../../lib/api";
import { errorMessage } from "../../lib/utils";
import Button from "../common/Button";
import Modal from "../common/Modal";

const blankTask = {
  code: "",
  name: "",
  description: "",
  due_date: "",
  priority: "medium",
  status: "pending",
};

export default function TaskForm({ task, onClose, onSaved }) {
  const [form, setForm] = useState(blankTask);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(task?.id);

  useEffect(() => {
    setForm(
      task
        ? {
            code: task.code ?? "",
            name: task.name,
            description: task.description ?? "",
            due_date: task.due_date ?? "",
            priority: task.priority,
            status: task.status,
          }
        : blankTask,
    );
    setFiles([]);
    setError("");
  }, [task]);

  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key !== "code" || value.trim()) payload.append(key, value);
    });
    files.forEach((file) => payload.append("new_attachments", file));
    try {
      const response = isEditing
        ? await api.patch(`/tasks/${task.id}/`, payload)
        : await api.post("/tasks/", payload);
      onSaved(response.data);
      onClose();
    } catch (err) {
      setError(errorMessage(err, "The task could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEditing ? `Edit ${task.code}` : "Create task"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <label>
            <span className="field-label">
              Task code{" "}
              <span className="font-normal text-slate-400">optional</span>
            </span>
            <input
              className="field-input"
              maxLength="32"
              placeholder="TSK-001"
              value={form.code}
              onChange={(event) => set("code", event.target.value)}
            />
          </label>
          <label>
            <span className="field-label">Task name</span>
            <input
              className="field-input"
              maxLength="180"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              required
            />
          </label>
        </div>
        <label>
          <span className="field-label">Description</span>
          <textarea
            className="field-input min-h-28 resize-y"
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="Explain the expected outcome, context, or acceptance criteria."
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className="field-label">Due date</span>
            <input
              className="field-input"
              type="date"
              value={form.due_date}
              onChange={(event) => set("due_date", event.target.value)}
            />
          </label>
          <label>
            <span className="field-label">Priority</span>
            <select
              className="field-input"
              value={form.priority}
              onChange={(event) => set("priority", event.target.value)}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            <span className="field-label">Status</span>
            <select
              className="field-input"
              value={form.status}
              onChange={(event) => set("status", event.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
        <div>
          <span className="field-label">Image attachments</span>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50">
            <ImagePlus className="h-5 w-5 text-indigo-600" />
            <span>Choose JPG, PNG, GIF, or WebP files</span>
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={(event) =>
                setFiles(Array.from(event.target.files ?? []))
              }
            />
          </label>
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600"
                >
                  {file.name}
                  <button
                    type="button"
                    onClick={() =>
                      setFiles(
                        files.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Save changes" : "Create task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
