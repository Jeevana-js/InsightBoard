'use server';
/**
 * @fileOverview A GenAI tool to assist users in elaborating on brief task titles into full descriptions.
 *
 * - generateTaskDetails - A function that generates detailed task information based on a title.
 * - GenerateTaskDetailsInput - The input type for the generateTaskDetails function.
 * - GenerateTaskDetailsOutput - The return type for the generateTaskDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTaskDetailsInputSchema = z.object({
  taskTitle: z.string().describe('The brief title of the task.'),
});
export type GenerateTaskDetailsInput = z.infer<typeof GenerateTaskDetailsInputSchema>;

const GenerateTaskDetailsOutputSchema = z.object({
  detailedDescription: z.string().describe('A comprehensive description of the task.'),
});
export type GenerateTaskDetailsOutput = z.infer<typeof GenerateTaskDetailsOutputSchema>;

const generateTaskDetailsPrompt = ai.definePrompt({
  name: 'generateTaskDetailsPrompt',
  input: {schema: GenerateTaskDetailsInputSchema},
  output: {schema: GenerateTaskDetailsOutputSchema},
  prompt: `You are an AI assistant specialized in project management and task breakdown.
  Given a brief task title, your goal is to generate a detailed and comprehensive description of the task.

  Task Title: {{{taskTitle}}}

  Provide your response in a structured JSON format according to the output schema.`,
});

const generateTaskDetailsFlow = ai.defineFlow(
  {
    name: 'generateTaskDetailsFlow',
    inputSchema: GenerateTaskDetailsInputSchema,
    outputSchema: GenerateTaskDetailsOutputSchema,
  },
  async input => {
    const {output} = await generateTaskDetailsPrompt(input);
    if (!output) {
      throw new Error('Failed to generate task details.');
    }
    return output;
  }
);

export async function generateTaskDetails(
  input: GenerateTaskDetailsInput
): Promise<GenerateTaskDetailsOutput> {
  return generateTaskDetailsFlow(input);
}
