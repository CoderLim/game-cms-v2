import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr, respPage } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import {
  createGameSchema,
  parseBody,
  updateGameSchema,
} from '@/modules/admin/game-engine-validation';
import * as gameService from '@/modules/games/service';

async function GET({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get('pageSize') || 20))
    );
    const search = searchParams.get('search') || undefined;

    const { items, total } = await gameService.list({
      page,
      pageSize,
      search,
    });
    return respPage(items, total);
  } catch (error: any) {
    return respErr(error.message || 'Failed to list games');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = parseBody(createGameSchema, await request.json());

    const row = await gameService.create({
      key: body.key,
      title: body.title,
      description: body.description || undefined,
      embedUrl: body.embedUrl || undefined,
      sourceUrl: body.sourceUrl || undefined,
      imageUrl: body.imageUrl || undefined,
      provider: body.provider || undefined,
      embedType: body.embedType,
      orientation: body.orientation || undefined,
      aspectRatio: body.aspectRatio || undefined,
      status: body.status as gameService.GameStatus | undefined,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to create game');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = parseBody(updateGameSchema, await request.json());

    const row = await gameService.update(body.id, {
      key: body.key,
      title: body.title,
      description: body.description,
      embedUrl: body.embedUrl,
      sourceUrl: body.sourceUrl,
      imageUrl: body.imageUrl,
      provider: body.provider,
      embedType: body.embedType,
      orientation: body.orientation,
      aspectRatio: body.aspectRatio,
      status: body.status as gameService.GameStatus | undefined,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to update game');
  }
}

async function DELETE({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!id) return respErr('id is required');

    return respData(await gameService.remove(id));
  } catch (error: any) {
    return respErr(error.message || 'Failed to delete game');
  }
}

export const Route = createFileRoute('/api/admin/game-catalog')({
  server: { handlers: { GET, POST, PUT, DELETE } },
});