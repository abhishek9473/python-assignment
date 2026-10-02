import { useEffect, useMemo, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { Download, ListFilter, Plus, RefreshCw } from "lucide-react";
import api from "../../lib/api";
import useTasks from "../../hooks/useTasks";
import { errorMessage, STATUS } from "../../lib/utils";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import BoardColumn from "./BoardColumn";
import TaskFilters from "../tasks/TaskFilters";
import Pagination from "../tasks/Pagination";
import TaskDrawer from "../tasks/TaskDrawer";
import TaskForm from "../tasks/TaskForm";

const initialFilters = {
  search: "",
  status: "",
  priority: "",
  due_date_order: "",
};
const statusKeys = Object.keys(STATUS);

const moveItem = (items, from, to) => {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export default function TaskBoard({ user }) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [dragError, setDragError] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { tasks, count, loading, error, refresh } = useTasks(filters, page);
  const isAdmin = user.is_staff;
  const priorityView = !filters.due_date_order;

  useEffect(() => {
    setPage(1);
  }, [
    filters.search,
    filters.status,
    filters.priority,
    filters.due_date_order,
  ]);

  const columns = useMemo(
    () =>
      statusKeys.reduce((result, status) => {
        result[status] = tasks.filter((task) => task.status === status);
        return result;
      }, {}),
    [tasks],
  );

  const savePriorityOrder = async (orderedIds) => {
    setSavingOrder(true);
    try {
      await api.post("/tasks/reorder/", { ordered_task_ids: orderedIds });
      await refresh();
    } catch (err) {
      setDragError(errorMessage(err, "Priority order could not be saved."));
      await refresh();
    } finally {
      setSavingOrder(false);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || savingOrder) return;
    setDragError("");
    if (source.droppableId === destination.droppableId) {
      if (!isAdmin) return;
      if (!priorityView) {
        setDragError("Clear due-date sorting before changing priority order.");
        return;
      }
      if (source.index === destination.index) return;
      await savePriorityOrder(
        moveItem(
          columns[source.droppableId],
          source.index,
          destination.index,
        ).map((task) => task.id),
      );
      return;
    }
    try {
      await api.patch(`/tasks/${draggableId}/status/`, {
        status: destination.droppableId,
      });
      if (isAdmin && priorityView) {
        const destinationIds = columns[destination.droppableId].map(
          (task) => task.id,
        );
        destinationIds.splice(destination.index, 0, Number(draggableId));
        await savePriorityOrder(destinationIds);
      } else {
        await refresh();
      }
    } catch (err) {
      setDragError(errorMessage(err, "Status could not be updated."));
      await refresh();
    }
  };

  // const exportTasks = async (format) => {
  //   setExporting(true);
  //   try {
  //     const params = { format };
  //     Object.entries(filters).forEach(([key, value]) => {
  //       if (value) params[key] = value;
  //     });
  //     const { data } = await api.get("/tasks/export/", {
  //       params,
  //       responseType: "blob",
  //     });
  //     const url = URL.createObjectURL(data);
  //     const link = document.createElement("a");
  //     link.href = url;
  //     link.download = `tasks.${format === "xlsx" ? "xlsx" : "pdf"}`;
  //     link.click();
  //     URL.revokeObjectURL(url);
  //   } catch (err) {
  //     setDragError(errorMessage(err, "Export could not be created."));
  //   } finally {
  //     setExporting(false);
  //   }
  // };

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-indigo-600">WORKSPACE</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Task board
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {count} task{count === 1 ? "" : "s"} in your current view
            {isAdmin ? " · priority is shared across the team" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={refresh}
            disabled={loading}
            title="Refresh tasks"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isAdmin && (
            <>
              {/* <div className="relative group">
                <Button variant="secondary" disabled={exporting}>
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <div className="invisible absolute right-0 z-20 mt-1 w-32 rounded-lg border bg-white p-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 focus-within:visible focus-within:opacity-100">
                  <button
                    onClick={() => exportTasks("xlsx")}
                    className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => exportTasks("pdf")}
                    className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    PDF (.pdf)
                  </button>
                </div>
              </div> */}
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                New task
              </Button>
            </>
          )}
        </div>
      </div>
      <TaskFilters filters={filters} onChange={setFilters} />
      <div className="mt-3 min-h-5">
        {dragError && (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {dragError}
          </p>
        )}
        {isAdmin && !priorityView && (
          <p className="flex items-center gap-2 px-1 text-xs text-amber-700">
            <ListFilter className="h-3.5 w-3.5" />
            Due-date sorting is active. Clear it to adjust the shared vertical
            priority order.
          </p>
        )}
      </div>
      {error && (
        <div className="mt-4">
          <EmptyState title="Unable to load tasks" message={error} />
        </div>
      )}
      {!error && (
        <>
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
              {statusKeys.map((status) => (
                <BoardColumn
                  key={status}
                  status={status}
                  tasks={columns[status]}
                  isAdmin={isAdmin}
                  onOpen={setSelectedTaskId}
                />
              ))}
            </div>
          </DragDropContext>
          {!loading && tasks.length === 0 && (
            <div className="pointer-events-none -mt-[29rem] relative">
              <EmptyState />{" "}
            </div>
          )}
          <Pagination page={page} total={count} onChange={setPage} />
        </>
      )}
      {creating && (
        <TaskForm onClose={() => setCreating(false)} onSaved={refresh} />
      )}
      <TaskDrawer
        taskId={selectedTaskId}
        user={user}
        onClose={() => setSelectedTaskId(null)}
        onTaskChanged={refresh}
      />
    </main>
  );
}
