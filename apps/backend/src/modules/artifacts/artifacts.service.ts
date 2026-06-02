import { Injectable, NotFoundException } from '@nestjs/common';
import { ArtifactStatus, ArtifactType, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ProjectContextsService } from '../project-contexts/project-contexts.service';

export interface CreateArtifactInput {
  userId: string;
  projectContextId?: string;
  type: ArtifactType;
  inputText: string;
  outputText: string;
  status?: ArtifactStatus;
  qualityScore?: number;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ArtifactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectContextsService: ProjectContextsService,
  ) {}

  async createArtifact(input: CreateArtifactInput) {
    const projectContextId = await this.resolveProjectContextId(
      input.userId,
      input.projectContextId,
    );

    return this.prisma.artifact.create({
      data: {
        userId: input.userId,
        projectContextId,
        type: input.type,
        inputText: input.inputText,
        outputText: input.outputText,
        status: input.status,
        qualityScore: input.qualityScore,
        metadata: input.metadata,
      },
    });
  }

  getLastArtifactsByUser(userId: string, limit = 10) {
    return this.prisma.artifact.findMany({
      where: { userId },
      include: { projectContext: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getArtifactById(id: string) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id },
      include: { projectContext: true },
    });

    if (!artifact) {
      throw new NotFoundException('Artifact not found');
    }

    return artifact;
  }

  async saveArtifact(id: string) {
    await this.ensureArtifactExists(id);

    return this.prisma.artifact.update({
      where: { id },
      data: { status: ArtifactStatus.SAVED },
    });
  }

  async markFailed(id: string, metadata?: Prisma.InputJsonValue) {
    await this.ensureArtifactExists(id);

    return this.prisma.artifact.update({
      where: { id },
      data: {
        status: ArtifactStatus.FAILED,
        metadata,
      },
    });
  }

  async getLastArtifactByUser(userId: string) {
    const artifact = await this.prisma.artifact.findFirst({
      where: { userId },
      include: { projectContext: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!artifact) {
      throw new NotFoundException('Artifact not found');
    }

    return artifact;
  }

  private async ensureArtifactExists(id: string): Promise<void> {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!artifact) {
      throw new NotFoundException('Artifact not found');
    }
  }

  private async resolveProjectContextId(
    userId: string,
    projectContextId?: string,
  ): Promise<string> {
    if (projectContextId) {
      return projectContextId;
    }

    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { defaultProjectContextId: true },
    });

    if (settings?.defaultProjectContextId) {
      return settings.defaultProjectContextId;
    }

    const defaultContext = await this.projectContextsService.getDefaultContext();

    return defaultContext.id;
  }
}
