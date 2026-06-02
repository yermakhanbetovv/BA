import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const projectContexts = [
  {
    key: 'personal',
    name: 'Personal',
    description: 'Обычный рабочий контекст бизнес-аналитика.',
    context:
      'Базовый контекст для задач бизнес-аналитика, Jira, требований, комментариев, дейли и чек-листов.',
    isDefault: true,
  },
  {
    key: 'allur_finance',
    name: 'Allur Finance',
    description:
      'Контекст автокредитования, клиентского модуля, админ-панели, финансового консультанта, банков и документов.',
    context:
      'Учитывать автокредитование, клиентский модуль, админ-панель, финансового консультанта, банки, документы клиента, заявки, статусы, UI, роли и интеграции.',
    isDefault: false,
  },
  {
    key: 'nurbank_auto',
    name: 'Нурбанк автокредитование',
    description:
      'Контекст ТЗ по ГОСТ 34 для системы кредитного конвейера автокредитования.',
    context:
      'Информационная система «Кредитный конвейер автокредитования АО Нурбанк». Фокус: автокредитование физических лиц, заявка, клиент, автомобиль как залог, банк, финансовый консультант, кредитное решение, интеграции, электронное кредитное досье. Не уходить в общий кредитный конвейер.',
    isDefault: false,
  },
  {
    key: 'toolbox',
    name: 'ToolBox',
    description:
      'Контекст pet/project management, frontend/backend задач, React Native, NestJS, Prisma.',
    context:
      'Учитывать задачи frontend/backend, React/TypeScript, React Native Expo, NestJS, Prisma, PostgreSQL, тесты, ветки, README и проектную работу.',
    isDefault: false,
  },
];

async function main(): Promise<void> {
  for (const projectContext of projectContexts) {
    await prisma.projectContext.upsert({
      where: { key: projectContext.key },
      update: projectContext,
      create: projectContext,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
