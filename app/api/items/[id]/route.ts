import { NextRequest, NextResponse } from "next/server";

import { getFanzaItemById } from "@/lib/fanza";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;

  try {
    const item = await getFanzaItemById(id);

    if (!item) {
      return NextResponse.json({ message: "Item not found." }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
