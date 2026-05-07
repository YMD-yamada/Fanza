"use client";

import type { CatalogId } from "@/lib/catalogs";
import type { SourceId } from "@/lib/types";
import { useEffect } from "react";
import { useHistory } from "@/lib/useStorage";

type Props = {
  id: string;
  title: string;
  imageUrl?: string;
  actressNames: string[];
  catalog?: CatalogId;
  source?: SourceId;
};

export function RecordHistory(props: Props) {
  const { record } = useHistory();
  useEffect(() => {
    record(props);
  }, [props, record]);
  return null;
}
