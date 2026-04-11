import express from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql, type SQL } from "drizzle-orm";
import { classes, subjects } from "../db/schema/index.js";
import { user } from "../db/schema/auth.js";
import { db } from "../db/index.js";

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const [createdClass] = await db.insert(classes).values({
            ...req.body,
            inviteCode: Math.random().toString(36).substring(2, 9),
            schedules: []
        }).returning({ id: classes.id });

        if (!createdClass) throw new Error('Failed to create class');

        res.status(201).json({ data: createdClass });
    } catch (e) {
        console.error(`POST /classes error ${e}`);
        res.status(500).json({ error: 'Failed to create class.' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { search, subject, teacher, page = 1, limit = 10 } = req.query;

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100); // Max 100 records per page

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions: SQL[] = [];

        // If the search query exists, filter by class name OR invite code
        if (search) {
            const searchPattern = `%${String(search).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(
                or(
                    ilike(classes.name, searchPattern),
                    ilike(classes.inviteCode, searchPattern)
                )!
            );
        }

        // If the subject filter exists, match the subject name
        if (subject) {
            const subjectPattern = `%${String(subject).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(ilike(subjects.name, subjectPattern));
        }

        // If the teacher filter exists, match the teacher name
        if (teacher) {
            const teacherPattern = `%${String(teacher).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(ilike(user.name, teacherPattern));
        }

        // Combine all filters using AND if any exists
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause);

        const totalCount = Number(countResult[0]?.count ?? 0);

        const classesList = await db
            .select({
                ...getTableColumns(classes),
                subject: { ...getTableColumns(subjects) },
                teacher: { ...getTableColumns(user) }
            })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause)
            .orderBy(desc(classes.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: classesList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });
    } catch (e) {
        console.error(`GET /classes error: ${e}`);
        res.status(500).json({ error: 'Failed to fetch classes.' });
    }
});

export default router;
