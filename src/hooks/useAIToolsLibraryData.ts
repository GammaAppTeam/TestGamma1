import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Tool = {
  tool_id: string;
  tool_name: string;
  category: string;
  collective_summary: string;
  last_updated_at: string;
  tool_url?: string;
};

export type ToolInsight = {
  tool_id: string;
  // ...include other fields if needed
};

export type ToolWithInsights = Tool & { insightsCount: number };

const TOOL_CATEGORIES = [
  "All",
  "Text Generation",
  "Image Generation",
  "Audio Generation",
  "Video Generation",
  "TTS",
  "Prompt Engineering",
  "Code Assistant",
  "Data Analysis",
  "Research",
  "Design",
  "Other",
];

export function useAIToolsLibraryData() {
  const [tools, setTools] = useState<ToolWithInsights[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string|undefined>();
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<"Newest"|"Most Insights">("Newest");
  const [reloadToken, setReloadToken] = useState(0);

  // Fetch tools & insights count
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      // Fetch tools
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select('*')
        .order('last_updated_at', { ascending: false });

      if (toolsError) {
        throw new Error(toolsError.message);
      }

      // Fetch insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('tool_insights')
        .select('tool_id');

      if (insightsError) {
        throw new Error(insightsError.message);
      }

      const insightsCountByToolId: Record<string, number> = {};
      const safeInsightsData = Array.isArray(insightsData) ? insightsData : [];
      
      for (const insight of safeInsightsData) {
        if (insight && insight.tool_id) {
          insightsCountByToolId[insight.tool_id] = (insightsCountByToolId[insight.tool_id] || 0) + 1;
        }
      }

      const safeToolsData = Array.isArray(toolsData) ? toolsData : [];
      const merged: ToolWithInsights[] = safeToolsData.map((tool) => ({
        ...tool,
        insightsCount: insightsCountByToolId[tool.tool_id] || 0,
      }));

      setTools(merged);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("Unable to load tools or insights. Please try again.");
      setTools([]);
    } finally {
      setLoading(false);
    }
  }, [reloadToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtering and sorting - ensure tools is always an array
  const safeTools = Array.isArray(tools) ? tools : [];
  const filteredTools: ToolWithInsights[] = safeTools
    .filter((tool) => {
      if (!tool) return false;
      const matchesCategory = category === "All" || tool.category === category;
      const matchesSearch = !search || 
        (tool.tool_name && tool.tool_name.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (!a || !b) return 0;
      if (sort === "Newest") {
        const dateA = a.last_updated_at ? new Date(a.last_updated_at).getTime() : 0;
        const dateB = b.last_updated_at ? new Date(b.last_updated_at).getTime() : 0;
        return dateB - dateA;
      } else {
        const countA = a.insightsCount || 0;
        const countB = b.insightsCount || 0;
        return countB - countA;
      }
    });

  // Used to refetch data after new insight
  const refetch = () => setReloadToken((t) => t + 1);

  return {
    tools: filteredTools,
    loading,
    error,
    category,
    setCategory,
    search,
    setSearch,
    sort,
    setSort,
    refetch,
    isEmpty: (filteredTools.length === 0 && !loading && !error),
    allCategories: TOOL_CATEGORIES,
  }
}
