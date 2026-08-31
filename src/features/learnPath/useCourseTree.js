import { useCallback, useEffect, useState } from 'react';

import { buildCourseTree, getLocalCourse, loadCourseTree } from '../../services/content/contentRepository';

export default function useCourseTree(languageId = 'patois') {
  const [state, setState] = useState(() => ({
    ...buildCourseTree(getLocalCourse(languageId)),
    loading: true,
    error: null,
  }));

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const tree = await loadCourseTree(languageId);
      setState({ ...tree, loading: false, error: null });
      return tree;
    } catch (error) {
      const fallback = buildCourseTree(getLocalCourse(languageId));
      setState({ ...fallback, loading: false, error });
      return fallback;
    }
  }, [languageId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const tree = await loadCourseTree(languageId);
        if (!cancelled) setState({ ...tree, loading: false, error: null });
      } catch (error) {
        if (!cancelled) {
          const fallback = buildCourseTree(getLocalCourse(languageId));
          setState({ ...fallback, loading: false, error });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [languageId]);

  return {
    ...state,
    refresh,
  };
}
