"use client";

import { useEffect } from "react";
import { useHistory } from "@/lib/useStorage";

type Props = {
  id: string;
  title: string;
  imageUrl?: string;
  actressNames: string[];
};

export function RecordHistory(props: Props) {
  const { record } = useHistory();
  useEffect(() => {
    record(props);
  }, [props, record]);
  return null;
}
