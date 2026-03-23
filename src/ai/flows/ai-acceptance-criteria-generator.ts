'use server';
/**
 * @fileOverview A Genkit flow for generating acceptance criteria for a given task.
 *
 * - aiAcceptanceCriteriaGenerator - A function that generates acceptance criteria based on task details.
 * - AIAcceptanceCriteriaGeneratorInput - The input type for the aiAcceptanceCriteriaGenerator function.
 * - AIAcceptanceCriteriaGeneratorOutput - The return type for the aiAcceptanceCriteriaGenerator function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIAcceptanceCriteriaGeneratorInputSchema = z.object({
  taskTitle: z.string().describe('The title of the task.'),
  taskDescription: z.string().describe('The detailed description of the task.'),
});
export type AIAcceptanceCriteriaGeneratorInput = z.infer<typeof AIAcceptanceCriteriaGeneratorInputSchema>;

const AIAcceptanceCriteriaGeneratorOutputSchema = z.object({
  acceptanceCriteria: z.array(z.string()).describe('A list of acceptance criteria for the task.'),
});
export type AIAcceptanceCriteriaGeneratorOutput = z.infer<typeof AIAcceptanceCriteriaGeneratorOutputSchema>;

export async function aiAcceptanceCriteriaGenerator(
  input: AIAcceptanceCriteriaGeneratorInput
): Promise<AIAcceptanceCriteriaGeneratorOutput> {
  return aiAcceptanceCriteriaGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAcceptanceCriteriaPrompt',
  input: {schema: AIAcceptanceCriteriaGeneratorInputSchema},
  output: {schema: AIAcceptanceCriteriaGeneratorOutputSchema},
  prompt: `You are an expert software engineer and product manager. Your task is to generate clear, concise, and testable acceptance criteria for a given software development task. The acceptance criteria should define the "done" state of the task from a user's perspective.

Given the following task:

Task Title: {{{taskTitle}}}

Task Description:
{{{taskDescription}}}

Generate a list of acceptance criteria. Each criterion should be a single, testable statement.
Respond with a JSON object containing a single key "acceptanceCriteria" which is an array of strings, where each string is an acceptance criterion.

Example output:
{
  "acceptanceCriteria": [
    "User can log in with valid credentials.",
    "User receives an error message with invalid credentials.",
    "Password field masks input."
  ]
}`,
});

const aiAcceptanceCriteriaGeneratorFlow = ai.defineFlow(
  {
    name: 'aiAcceptanceCriteriaGeneratorFlow',
    inputSchema: AIAcceptanceCriteriaGeneratorInputSchema,
    outputSchema: AIAcceptanceCriteriaGeneratorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
