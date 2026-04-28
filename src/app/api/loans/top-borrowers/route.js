import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export async function GET() {
  try {
    const result = await sql`
      WITH loan_summary AS (
        SELECT
          m.id AS member_id,
          m.name AS full_name,
          m.email,
          'STUDENT' AS member_type,
          COUNT(l.id) AS total_loans,
          MAX(l.loan_date) AS last_loan_date
        FROM members m
        JOIN loans l ON m.id = l.member_id
        GROUP BY m.id, m.name, m.email
      ),
      favorite_books AS (
        SELECT DISTINCT ON (l.member_id)
          l.member_id,
          b.title,
          COUNT(*) AS times_borrowed
        FROM loans l
        JOIN books b ON l.book_id = b.id
        GROUP BY l.member_id, b.title
        ORDER BY l.member_id, COUNT(*) DESC
      )
      SELECT
        ls.member_id,
        ls.full_name,
        ls.email,
        ls.member_type,
        ls.total_loans,
        ls.last_loan_date,
        fb.title,
        fb.times_borrowed
      FROM loan_summary ls
      JOIN favorite_books fb ON ls.member_id = fb.member_id
      ORDER BY ls.total_loans DESC
      LIMIT 3;
    `;

    const data = result.map((row) => ({
      member_id: row.member_id,
      full_name: row.full_name,
      email: row.email,
      member_type: row.member_type,
      total_loans: Number(row.total_loans),
      last_loan_date: row.last_loan_date,
      favorite_book: {
        title: row.title,
        times_borrowed: Number(row.times_borrowed),
      },
    }));

    return Response.json({
      message: "Top 3 peminjam buku berhasil diambil",
      data: data,
    });
  } catch (error) {
    return Response.json(
      {
        message: "Gagal mengambil data top 3 peminjam",
        error: error.message,
      },
      { status: 500 }
    );
  }
}