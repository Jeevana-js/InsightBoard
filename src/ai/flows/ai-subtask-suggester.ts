'use server';
/**
 * @fileOverview An AI agent that suggests sub-tasks for a given main task.
 *
 * - aiSubtaskSuggester - A function that handles the sub-task suggestion process.
 * - AISubtaskSuggesterInput - The input type for the aiSubtaskSuggester function.
 * - AISubtaskSuggesterOutput - The return type for the aiSubtaskSuggester function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AISubtaskSuggesterInputSchema = z.object({
  mainTaskDescription: z.string().describe('The description of the main task.'),
});
export type AISubtaskSuggesterInput = z.infer<typeof AISubtaskSuggesterInputSchema>;

const AISubtaskSuggesterOutputSchema = z.object({
  subtasks: z.array(z.string()).describe('An array of suggested sub-tasks.'),
});
export type AISubtaskSuggesterOutput = z.infer<typeof AISubtaskSuggesterOutputSchema>;

export async function aiSubtaskSuggester(input: AISubtaskSuggesterInput): Promise<AISubtaskSuggesterOutput> {
  return aiSubtaskSuggesterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'subtaskSuggesterPrompt',
  input: {schema: AISubtaskSuggesterInputSchema},
  output: {schema: AISubtaskSuggesterOutputSchema},
  prompt: `You are an expert at breaking down complex tasks into smaller, manageable sub-tasks.\nBased on the following main task description, generate a list of relevant sub-tasks.\nEnsure the sub-tasks are actionable and contribute to completing the main task.\n\nMain Task: {{{mainTaskDescription}}}\n\nGenerate the output as a JSON object with a single field 'subtasks' which is an array of strings.`
});

const aiSubtaskSuggesterFlow = ai.defineFlow(
  {
    name: 'aiSubtaskSuggesterFlow',
    inputSchema: AISubtaskSuggesterInputSchema,
    outputSchema: AISubtaskSuggesterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
