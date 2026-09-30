import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateSubmission } from '@/lib/forms/validation';
import type { FieldType } from '@/lib/forms/types';
import { z } from 'zod';