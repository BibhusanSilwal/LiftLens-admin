"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../../components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";
import { SkeletonRows } from "../../../components/Skeleton";
import { Apple, BadgeCheck, Download, Edit, Trash2, Search } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 50;
const DEFAULT_CUISINES = ["nepali", "newari", "thakali", "tibetan", "indian", "global", "packaged"];
const SOURCES = [
  { value: "", label: "All sources" },
  { value: "recipe", label: "Recipes" },
  { value: "manual", label: "Added by staff" },
  { value: "nepal_fct", label: "Nepal FCT" },
  { value: "ifct", label: "IFCT" },
  { value: "usda", label: "USDA" },
  { value: "off", label: "Open Food Facts" },
];
const SOURCE_LABEL = Object.fromEntries(SOURCES.filter((s) => s.value).map((s) => [s.value, s.label]));

const EMPTY_FORM = {
  name: "", calories: "", protein: "", fats: "", carbs: "",
  cuisine: "", category: "", alt_names: "", serving_label: "", serving_grams: "",
  image_url: "", image_credit: "", ingredients: "", is_verified: false,
};

// "Rice (uncooked), 100" per line <-> [{name, grams}]
const parseIngredients = (text) =>
  text
    .split("\n")
    .map((line) => {
      const i = line.lastIndexOf(",");
      if (i < 0) return null;
      const grams = parseFloat(line.slice(i + 1));
      const name = line.slice(0, i).trim();
      return name && grams > 0 ? { name, grams } : null;
    })
    .filter(Boolean);
const formatIngredients = (list) => (list || []).map((x) => `${x.name}, ${x.grams}`).join("\n");

const toForm = (food) => ({
  name: food.name || "",
  calories: String(food.calories ?? ""),
  protein: String(food.protein ?? ""),
  fats: String(food.fats ?? ""),
  carbs: String(food.carbs ?? ""),
  cuisine: food.cuisine || "",
  category: food.category || "",
  alt_names: food.alt_names || "",
  serving_label: food.serving_label || "",
  serving_grams: food.serving_grams != null ? String(food.serving_grams) : "",
  image_url: food.image_url || "",
  image_credit: food.image_credit || "",
  ingredients: formatIngredients(food.ingredients),
  is_verified: !!food.is_verified,
});

const toPayload = (form) => ({
  name: form.name.trim(),
  calories: parseFloat(form.calories) || 0,
  protein: parseFloat(form.protein) || 0,
  fats: parseFloat(form.fats) || 0,
  carbs: parseFloat(form.carbs) || 0,
  cuisine: form.cuisine.trim().toLowerCase(),
  category: form.category.trim().toLowerCase(),
  alt_names: form.alt_names.trim(),
  serving_label: form.serving_label.trim(),
  serving_grams: parseFloat(form.serving_grams) > 0 ? parseFloat(form.serving_grams) : null,
  image_url: form.image_url.trim(),
  image_credit: form.image_credit.trim(),
  ingredients: parseIngredients(form.ingredients),
  is_verified: form.is_verified,
});

const selectClass =
  "h-10 rounded-md border border-[#333] bg-[#1a1a1a] px-3 text-sm text-white";

function FoodForm({ form, onChange, cuisines, submitLabel, onCancel, onSubmit, busy }) {
  const set = (name) => (e) => onChange({ ...form, [name]: e.target.value });
  const num = (label, name) => (
    <div>
      <Label>{label}</Label>
      <Input type="number" step="0.1" min="0" value={form[name]} onChange={set(name)} required />
    </div>
  );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Food name</Label>
        <Input value={form.name} onChange={set("name")} required />
      </div>
      <p className="text-xs text-gray-400">Nutrition values are per 100 g.</p>
      <div className="grid grid-cols-2 gap-4">
        {num("Calories (kcal)", "calories")}
        {num("Protein (g)", "protein")}
        {num("Fats (g)", "fats")}
        {num("Carbs (g)", "carbs")}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cuisine</Label>
          <Input list="food-cuisines" value={form.cuisine} onChange={set("cuisine")} placeholder="nepali" />
          <datalist id="food-cuisines">
            {cuisines.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <Label>Category</Label>
          <Input value={form.category} onChange={set("category")} placeholder="momo, dal, curry…" />
        </div>
      </div>
      <div>
        <Label>Other names (searchable)</Label>
        <Input value={form.alt_names} onChange={set("alt_names")} placeholder="mo:mo, dumpling" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Serving</Label>
          <Input value={form.serving_label} onChange={set("serving_label")} placeholder="1 plate" />
        </div>
        <div>
          <Label>Serving weight (g)</Label>
          <Input type="number" step="1" min="0" value={form.serving_grams} onChange={set("serving_grams")} />
        </div>
      </div>
      <div>
        <Label>Ingredients (one per line: name, grams)</Label>
        <textarea
          value={form.ingredients}
          onChange={set("ingredients")}
          rows={4}
          placeholder={"Rice (uncooked), 100\nLentils (dal), 60"}
          className="w-full rounded-md border border-[#333] bg-[#1a1a1a] p-3 text-sm text-white placeholder:text-gray-500"
        />
      </div>
      <div>
        <Label>Photo link</Label>
        <Input value={form.image_url} onChange={set("image_url")} placeholder="https://…" />
        <p className="mt-1 text-xs text-gray-400">
          Use a photo you took or one with an open licence. The app shows a small compressed copy.
        </p>
      </div>
      <div>
        <Label>Photo credit</Label>
        <Input
          value={form.image_credit}
          onChange={set("image_credit")}
          placeholder="Photo: Name, CC BY-SA 4.0"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <Checkbox
          checked={form.is_verified}
          onCheckedChange={(v) => onChange({ ...form, is_verified: v === true })}
        />
        Values checked against a trusted source
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function FoodDatabasePage() {
  const router = useRouter();

  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    };
    if (getCookie("user-type") === "gym") router.replace("/dashboard");
  }, [router]);

  const csvInputRef = useRef(null);
  const generation = useRef(0);
  const [foods, setFoods] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [facets, setFacets] = useState({ cuisines: [], categories: [] });
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formMode, setFormMode] = useState(null); // "add" | "edit" | null
  const [selectedFood, setSelectedFood] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const cuisines = [...new Set([...DEFAULT_CUISINES, ...facets.cuisines])];

  const buildQuery = useCallback(
    (limit, offset) => {
      const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) q.set("search", search);
      if (cuisine) q.set("cuisine", cuisine);
      if (source) q.set("source", source);
      return q.toString();
    },
    [search, cuisine, source]
  );

  // One extra row tells us whether a next page exists.
  const fetchFoods = useCallback(async () => {
    const gen = ++generation.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/foods?${buildQuery(PAGE_SIZE + 1, (page - 1) * PAGE_SIZE)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (gen !== generation.current) return; // a newer search replaced this one
      setHasMore(data.length > PAGE_SIZE);
      setFoods(data.slice(0, PAGE_SIZE));
    } catch {
      if (gen === generation.current) toast.error("Failed to load food database");
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, [buildQuery, page]);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  useEffect(() => {
    fetch("/api/foods/facets")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setFacets(d))
      .catch(() => {});
  }, []);

  // Wait for a pause in typing before asking the server.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setSelectedFood(null);
    setFormMode("add");
  };
  const openEdit = (food) => {
    setForm(toForm(food));
    setSelectedFood(food);
    setFormMode("edit");
  };

  const saveFood = async (e) => {
    e.preventDefault();
    const editing = formMode === "edit" && selectedFood?.id;
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/foods/${selectedFood.id}` : "/api/foods", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.detail === "string" ? err.detail : "Could not save this food. Check the values."
        );
      }
      setFormMode(null);
      setSelectedFood(null);
      toast.success(editing ? "Food updated" : "Food added");
      await fetchFoods();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedFood?.id) return;
    try {
      const res = await fetch(`/api/foods?id=${selectedFood.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setIsDeleteOpen(false);
      setSelectedFood(null);
      toast.success("Food deleted");
      await fetchFoods();
    } catch {
      toast.error("Failed to delete food item");
    }
  };

  // Every food matching the current filters, 100 at a time (capped at 10,000).
  const exportToCSV = async () => {
    try {
      const rows = [];
      for (let offset = 0; offset < 10000; offset += 100) {
        const res = await fetch(`/api/foods?${buildQuery(100, offset)}`);
        if (!res.ok) throw new Error();
        const batch = await res.json();
        rows.push(...batch);
        if (batch.length < 100) break;
      }
      if (rows.length === 0) return toast.error("No data to export");
      const cell = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
      const header = ["Name", "Category", "Cuisine", "Calories", "Protein", "Fats", "Carbs",
        "Serving label", "Serving grams", "Alt names", "Ingredients", "Source", "Verified",
        "Image url", "Image credit"];
      const lines = rows.map((f) => [
        f.name, f.category, f.cuisine, f.calories, f.protein, f.fats, f.carbs,
        f.serving_label, f.serving_grams, f.alt_names,
        (f.ingredients || []).map((i) => `${i.name}:${i.grams}`).join("|"),
        f.source, f.is_verified ? "yes" : "no", f.image_url, f.image_credit,
      ].map(cell).join(","));
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `foods_database_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} foods`);
    } catch {
      toast.error("Export failed");
    }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only .csv files are allowed");
      e.target.value = "";
      return;
    }
    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/foods/import-csv?update_existing=${updateExisting ? "true" : "false"}`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "CSV import failed");
      const summary = `Rows: ${data.total_rows ?? 0} | Created: ${data.created ?? 0} | Updated: ${data.updated ?? 0} | Skipped: ${data.skipped ?? 0}`;
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        toast.warning("CSV imported with row errors", {
          description: `${summary}. ${data.errors.slice(0, 3).join(" ")}${data.errors.length > 3 ? ` (+${data.errors.length - 3} more)` : ""}`,
        });
      } else {
        toast.success("CSV imported", { description: summary });
      }
      await fetchFoods();
    } catch (err) {
      toast.error(err.message || "CSV import failed");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const filtered = search || cuisine || source;

  return (
    <div className="space-y-6 bg-black p-4 min-h-screen">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Food Database</h1>
          <div className="flex flex-wrap gap-3 items-center">
            <Button onClick={exportToCSV} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCSVImport} />
            <Button
              onClick={() => csvInputRef.current?.click()}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              disabled={isImporting}
            >
              {isImporting ? "Importing…" : "Import CSV"}
            </Button>
            <label className="flex items-center gap-2 rounded-md border border-[#333] px-3 py-2 text-sm text-gray-300">
              <Checkbox checked={updateExisting} onCheckedChange={(v) => setUpdateExisting(v === true)} />
              Update existing
            </label>
            <Button className="bg-red-600 hover:bg-red-700" onClick={openAdd}>+ Add food</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or other name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500"
            />
          </div>
          <select
            aria-label="Cuisine"
            value={cuisine}
            onChange={(e) => { setCuisine(e.target.value); setPage(1); }}
            className={selectClass}
          >
            <option value="">All cuisines</option>
            {cuisines.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            aria-label="Source"
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
            className={selectClass}
          >
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-500">
          Import CSV needs name, calories, protein, fats and carbs (per 100 g). Optional: category, cuisine,
          alt_names, serving_label, serving_grams, ingredients (Rice:100|Dal:50).
        </p>
      </div>

      <Card className="bg-black border-[#1c1c1e]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-red-600" />
            <span className="text-lg font-semibold text-white">Food items</span>
            <span className="text-sm text-gray-400">Page {page}</span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-white min-w-[900px]">
              <thead>
                <tr className="border-b border-[#333] text-left text-sm text-gray-400">
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Cuisine</th>
                  <th className="py-3 px-4 font-medium">Serving</th>
                  <th className="py-3 px-4 font-medium text-right">kcal</th>
                  <th className="py-3 px-4 font-medium text-right">Protein</th>
                  <th className="py-3 px-4 font-medium text-right">Fats</th>
                  <th className="py-3 px-4 font-medium text-right">Carbs</th>
                  <th className="py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows rows={8} cols={8} />
                ) : foods.map((food) => (
                  <tr key={food.id} className="border-b border-[#222] hover:bg-[#111]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-medium">
                        {food.thumbnail_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={food.thumbnail_url}
                            alt=""
                            loading="lazy"
                            className="h-8 w-8 shrink-0 rounded-md object-cover"
                          />
                        )}
                        {food.name}
                        {food.is_verified && (
                          <BadgeCheck className="h-4 w-4 shrink-0 text-green-500" aria-label="Verified" />
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {SOURCE_LABEL[food.source] || food.source}
                        {food.ingredients?.length ? ` · ${food.ingredients.length} ingredients` : ""}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-300">{food.cuisine || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {food.serving_label
                        ? `${food.serving_label}${food.serving_grams ? ` (${Math.round(food.serving_grams)} g)` : ""}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{food.calories}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{food.protein} g</td>
                    <td className="py-3 px-4 text-right tabular-nums">{food.fats} g</td>
                    <td className="py-3 px-4 text-right tabular-nums">{food.carbs} g</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" aria-label={`Edit ${food.name}`} onClick={() => openEdit(food)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${food.name}`}
                          className="text-red-600 hover:text-red-400"
                          onClick={() => { setSelectedFood(food); setIsDeleteOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && foods.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {filtered ? "No matching foods" : "No food items yet"}
            </div>
          )}

          <div className="flex items-center justify-between mt-6 px-4">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1 || loading}>
              Previous
            </Button>
            <span className="text-sm text-gray-400">Page {page}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!hasMore || loading}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={formMode !== null} onOpenChange={(open) => !open && setFormMode(null)}>
        <DialogContent className="bg-black border-[#1c1c1e] text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === "edit" ? "Edit food item" : "Add food item"}</DialogTitle>
          </DialogHeader>
          <FoodForm
            form={form}
            onChange={setForm}
            cuisines={cuisines}
            submitLabel={formMode === "edit" ? "Save changes" : "Add food"}
            onCancel={() => setFormMode(null)}
            onSubmit={saveFood}
            busy={saving}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-black border-[#1c1c1e]">
          <DialogHeader>
            <DialogTitle className="text-white">Delete food item</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400">
            Delete <span className="text-white font-semibold">{selectedFood?.name || "this item"}</span>?
            Meals members have already logged with this food will lose that item too.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster richColors position="top-right" />
    </div>
  );
}
