const fs = require('fs');
let code = fs.readFileSync('src/pages/app/employees/index.tsx', 'utf-8');

// 1. Add Tabs import
code = code.replace(
  "import {",
  "import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'\nimport {"
);

// 2. Add OrgNode and OrgChart
const orgComponents = \
function OrgNode({ employee, allEmployees }: { employee: Employee; allEmployees: Employee[] }) {
  const directReports = allEmployees.filter(e => e.manager_id === employee.id && e.status !== 'terminated')

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div className="relative z-10 w-[180px] rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
        <Avatar className="mx-auto mb-2 size-12 shadow-sm">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {\\\\}
          </AvatarFallback>
        </Avatar>
        <p className="text-sm font-semibold truncate px-1">{employee.first_name} {employee.last_name}</p>
        <p className="text-[10px] text-muted-foreground truncate px-1">{employee.position || 'Employee'}</p>
        <p className="text-[9px] text-primary mt-1 font-medium bg-primary/10 rounded-full px-2 py-0.5 inline-block truncate max-w-[140px]">
          {employee.departments?.name || 'No Dept'}
        </p>
      </div>

      {/* Children */}
      {directReports.length > 0 && (
        <div className="relative pt-6 flex justify-center">
          {/* Vertical line dropping from parent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-border"></div>
          
          <div className="flex justify-center">
            {directReports.map((child, i) => {
              const isFirst = i === 0
              const isLast = i === directReports.length - 1
              const isOnly = directReports.length === 1

              return (
                <div key={child.id} className="relative pt-6 px-3 flex flex-col items-center">
                  {/* Vertical line dropping to child */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-border"></div>
                  
                  {/* Horizontal connecting line logic */}
                  {!isOnly && (
                    <div 
                      className={\bsolute top-0 h-px bg-border \\}
                    />
                  )}

                  <OrgNode employee={child} allEmployees={allEmployees} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function OrgChart({ employees }: { employees: Employee[] }) {
  const empMap = new Set(employees.map(e => e.id))
  const roots = employees.filter(e => !e.manager_id || !empMap.has(e.manager_id))

  return (
    <div className="w-full overflow-x-auto pb-8 pt-4 custom-scrollbar">
      <div className="min-w-max flex justify-center gap-12">
        {roots.map(root => (
          <OrgNode key={root.id} employee={root} allEmployees={employees} />
        ))}
      </div>
    </div>
  )
}
\

code = code.replace("export default function EmployeesPage() {", orgComponents + "\nexport default function EmployeesPage() {");

// 3. Add activeTab state
code = code.replace(
  "const [deptFilter, setDeptFilter] = useState('all')",
  "const [deptFilter, setDeptFilter] = useState('all')\n  const [activeTab, setActiveTab] = useState('grid')"
);

// 4. Wrap Grid with Tabs
// We need to replace the section from \      {/* Employee Grid */}\
// to the closing brace of the \iltered.length === 0 ? ... : (...)\ block.
const tabsStart = \      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="org">Organization Chart</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="grid" className="m-0 focus-visible:outline-none focus-visible:ring-0">
\

const tabsEnd = \
        </TabsContent>
        
        <TabsContent value="org" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <Users className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No employees found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 bg-muted/20 overflow-hidden">
                <OrgChart employees={filtered} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
\

// Replace the {isLoading ? ... } logic block carefully
// First find {isLoading ?
const gridStartIdx = code.indexOf("{isLoading ? (");
if (gridStartIdx !== -1) {
  // Insert tabsStart before gridStartIdx
  code = code.slice(0, gridStartIdx) + tabsStart + code.slice(gridStartIdx);
}

// Now we need to find the end of the Employee Grid block.
// It ends with:
//           ))}
//         </div>
//       )}
//
//       {/* Add Employee Dialog */}
const dialogCommentIdx = code.indexOf("{/* Add Employee Dialog */}");
if (dialogCommentIdx !== -1) {
  // Backtrack to the )}
  const endOfGridStr = "      )}\\n";
  // Just insert before dialogCommentIdx
  code = code.slice(0, dialogCommentIdx) + tabsEnd + "\\n      " + code.slice(dialogCommentIdx);
}

fs.writeFileSync('src/pages/app/employees/index.tsx', code);
console.log('Done!');
