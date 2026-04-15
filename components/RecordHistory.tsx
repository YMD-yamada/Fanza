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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);
  return null;
}
