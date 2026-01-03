'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['paid', 'pending']),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    
    // Converting amount to cents
    const amountInCents = amount * 100;
    
    // Invoice creation date
    const date = new Date().toISOString().split('T')[0];

    try {
        // Insert the new invoice into the database
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
        console.error('Error creating invoice:', error);
        throw new Error('Invoice creation failed');
    }
    
    // Revalidate the invoices listing page
    revalidatePath('/dashboard/invoices');

    // Redirect to the invoices listing page
    redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    
    // Converting amount to cents
    const amountInCents = amount * 100;

    try {
        // Update the invoice in the database
    await sql`
        UPDATE invoices
        SET customer_id = ${customerId},
            amount = ${amountInCents},
            status = ${status}
        WHERE id = ${id}
    `;  
    } catch (error) {
        console.error('Error updating invoice:', error);
        throw new Error('Invoice update failed');
    }
    
    // Revalidate the invoices listing page
    revalidatePath('/dashboard/invoices');

    // Redirect to the invoices listing page
    redirect('/dashboard/invoices');
}

// Action to delete an invoice
export async function deleteInvoice(id: string) {
    // Delete the invoice from the database
    await sql`
        DELETE FROM invoices
        WHERE id = ${id}
    `;

    // Revalidate the invoices listing page
    revalidatePath('/dashboard/invoices');
}