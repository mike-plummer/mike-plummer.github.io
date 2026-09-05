import { educationCopy } from '@/lib/profile';

export function EducationSection() {
  return (
    <>
      <header className="major">
        <h2>{educationCopy.heading}</h2>
        <p>{educationCopy.subtitle}</p>
      </header>
      <ul className="statistics">
        {educationCopy.degrees.map((degree, index) => (
          <li key={degree.school} className={`style${index + 1}`}>
            <span className="icon fa-graduation-cap" />
            <strong>{degree.level}</strong> {degree.field}, {degree.school}
          </li>
        ))}
      </ul>
    </>
  );
}
