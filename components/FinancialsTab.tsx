import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Participant, FinancialRecord, ParticipantFinancials, FinancialUpdateAction, User } from '../types';
import { Button } from './Button';
import { getCurrentTrainingYear, getMonthsForTrainingYear } from '../utils/dateUtils';
import { FileSpreadsheetIcon, PrinterIcon, EditIcon } from './icons/Icons';
import { Select } from './Select';

interface FinancialsTabProps {
  participants: Participant[];
  financials: FinancialRecord;
  onFinancialsChange: (cef: string, action: FinancialUpdateAction) => void;
  currentUser: User;
  trainingYears: string[];
}

// A single, robust component for inline editing
interface EditableCellProps {
    initialValue: string;
    onSave: (newValue: string) => void;
    onCancel: () => void;
}

const EditableCell: React.FC<EditableCellProps> = ({ initialValue, onSave, onCancel }) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleSave = () => {
        onSave(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-24 bg-gray-900 border border-blue-500 text-white rounded-md p-1 text-xs text-right shadow-lg"
            placeholder="0,00"
        />
    );
};


export const FinancialsTab: React.FC<FinancialsTabProps> = ({ participants, financials, onFinancialsChange, currentUser, trainingYears }) => {
    const isAdmin = currentUser.role === 'admin';
    
    // State for filters
    const [selectedYear, setSelectedYear] = useState(getCurrentTrainingYear());
    const [selectedGroup, setSelectedGroup] = useState('all');
    
    // State for managing which cell is currently being edited
    const [editingCell, setEditingCell] = useState<string | null>(null); // format: `cef-month` or `cef-inscription`

    useEffect(() => {
        if (!trainingYears.includes(selectedYear)) {
          setSelectedYear(trainingYears[0] || getCurrentTrainingYear());
        }
    }, [trainingYears, selectedYear]);

    const months = useMemo(() => getMonthsForTrainingYear(selectedYear), [selectedYear]);

    const groupOptions = useMemo(() => {
        const participantsForYear = participants.filter(p => p.trainingYear === selectedYear);
        const groups = [...new Set(participantsForYear.map(p => p.groupe))];
        return [{ value: 'all', label: 'Tous les groupes' }, ...groups.sort().map(g => ({ value: g, label: g }))];
    }, [participants, selectedYear]);

    const filteredParticipants = useMemo(() => {
        // For users, participants prop is already filtered to only contain them
        if (!isAdmin) {
            return participants.filter(p => p.trainingYear === selectedYear);
        }
        return participants
            .filter(p => p.trainingYear === selectedYear)
            .filter(p => selectedGroup === 'all' || p.groupe === selectedGroup)
            .sort((a, b) => a.nom.localeCompare(b.nom));
    }, [participants, selectedGroup, selectedYear, isAdmin]);
    
    // --- Data Calculation ---
    const getParticipantFinancials = (cef: string): Required<ParticipantFinancials> => {
        const pFinancials = financials[cef];
        return {
            inscriptionStatus: pFinancials?.inscriptionStatus ?? 'En attente',
            monthlyPayments: pFinancials?.monthlyPayments ?? {},
            inscriptionPayment: pFinancials?.inscriptionPayment ?? 0,
        };
    };

    const calculateTotalPaid = (participant: Participant, pFinancials: Required<ParticipantFinancials>): number => {
        const monthlyTotal = Object.values(pFinancials.monthlyPayments).reduce((sum, val) => sum + val, 0);
        return pFinancials.inscriptionPayment + monthlyTotal;
    };
    
    const calculateBalance = (participant: Participant, pFinancials: Required<ParticipantFinancials>): number => {
        const monthlyTotal = Object.values(pFinancials.monthlyPayments).reduce((sum, val) => sum + val, 0);
        return monthlyTotal - participant.fraisFormation;
    }

    // --- Edit Handling ---
    const handleEdit = (cellId: string, initialValue: number) => {
        if (!isAdmin) return; // Prevent editing for users
        setEditingCell(cellId);
    };

    const handleCancelEdit = () => {
        setEditingCell(null);
    };

    const handleSave = (cef: string, type: 'inscription' | 'monthly', monthOrAmount: string | number, rawValue: string) => {
        const normalizedValue = rawValue.replace(/,/g, '.').trim();
        const newAmount = parseFloat(normalizedValue);
        const finalAmount = isNaN(newAmount) || newAmount < 0 ? 0 : newAmount;

        const originalAmount = typeof monthOrAmount === 'number' ? monthOrAmount : (getParticipantFinancials(cef).monthlyPayments[monthOrAmount] || 0);

        if (finalAmount !== originalAmount) {
            if (type === 'inscription') {
                onFinancialsChange(cef, { type: 'inscription', amount: finalAmount });
            } else {
                onFinancialsChange(cef, { type: 'monthly', month: monthOrAmount as string, amount: finalAmount });
            }
        }
        setEditingCell(null);
    };

    // --- Totals Calculation for Footer ---
    const tableTotals = useMemo(() => {
        return filteredParticipants.reduce((acc, p) => {
            const pFinancials = getParticipantFinancials(p.cef);
            acc.totalInscriptionFees += p.fraisInscription;
            acc.totalInscriptionPaid += pFinancials.inscriptionPayment;
            acc.totalFormationFees += p.fraisFormation;
            
            months.forEach(m => {
                const payment = pFinancials.monthlyPayments[m.value] || 0;
                acc.monthlyTotals[m.value] = (acc.monthlyTotals[m.value] || 0) + payment;
            });

            acc.grandTotalPaid += calculateTotalPaid(p, pFinancials);
            acc.totalBalance += calculateBalance(p, pFinancials);
            return acc;
        }, {
            totalInscriptionFees: 0,
            totalInscriptionPaid: 0,
            totalFormationFees: 0,
            monthlyTotals: {} as Record<string, number>,
            grandTotalPaid: 0,
            totalBalance: 0,
        });
    }, [filteredParticipants, financials, months]);


    // --- Export Functions ---
    const handleExportCsv = () => {
        if (filteredParticipants.length === 0) return;
        const monthHeaders = months.map(m => m.label);
        const headers = ['CEF', 'Nom', 'Prenom', 'Groupe', 'Frais Inscription', 'Paiement Inscription', 'Statut Inscription', ...monthHeaders, 'Total Payé', 'Solde Formation'];
        const rows = filteredParticipants.map(p => {
            const pFinancials = getParticipantFinancials(p.cef);
            const status = pFinancials.inscriptionPayment >= p.fraisInscription ? 'Payé' : 'En attente';
            return [
                p.cef, p.nom, p.prenom, p.groupe, p.fraisInscription, pFinancials.inscriptionPayment, status,
                ...months.map(m => pFinancials.monthlyPayments[m.value] || 0),
                calculateTotalPaid(p, pFinancials), calculateBalance(p, pFinancials)
            ].map(val => `"${String(val).toString().replace('.', ',').replace(/"/g, '""')}"`).join(';');
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(';'), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `recette_${selectedYear}_${selectedGroup}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintPdf = () => {
        if (filteredParticipants.length === 0) return;
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(18); doc.text('Rapport Financier', 14, 22);
        doc.setFontSize(11); doc.setTextColor(100);
        doc.text(`Année: ${selectedYear} | Groupe: ${groupOptions.find(g => g.value === selectedGroup)?.label}`, 14, 30);
        
        const head = [['Participant', 'Inscription', ...months.map(m => m.label.substring(0, 3)), 'Total Payé', 'Solde']];
        const body = filteredParticipants.map(p => {
            const pFinancials = getParticipantFinancials(p.cef);
            const status = pFinancials.inscriptionPayment >= p.fraisInscription ? 'Payé' : 'En attente';
            return [
                `${p.nom} ${p.prenom}`,
                `${pFinancials.inscriptionPayment.toFixed(2)}/${p.fraisInscription.toFixed(2)}\n(${status})`.replace(/\./g, ','),
                ...months.map(m => (pFinancials.monthlyPayments[m.value] || 0).toFixed(2).replace('.', ',')),
                calculateTotalPaid(p, pFinancials).toFixed(2).replace('.', ','),
                calculateBalance(p, pFinancials).toFixed(2).replace('.', ',')
            ];
        });
        const foot = [[
            'Totaux',
            `${tableTotals.totalInscriptionPaid.toFixed(2)} / ${tableTotals.totalInscriptionFees.toFixed(2)}`.replace(/\./g, ','),
            ...months.map(m => (tableTotals.monthlyTotals[m.value] || 0).toFixed(2).replace('.', ',')),
            tableTotals.grandTotalPaid.toFixed(2).replace('.', ','),
            tableTotals.totalBalance.toFixed(2).replace('.', ',')
        ]];

        // @ts-ignore
        doc.autoTable({
            head,
            body,
            foot,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 7, halign: 'center' },
            headStyles: { halign: 'center', valign: 'middle', fontStyle: 'bold' },
            footStyles: { halign: 'center', fontStyle: 'bold' },
            columnStyles: {
                0: { halign: 'left' }, // Participant column
            }
        });
        doc.save(`recette_${selectedYear}_${selectedGroup}.pdf`);
    };

    if (participants.length === 0) {
        return <div className="text-center py-12"><h3 className="text-xl font-semibold">Aucun participant importé.</h3>{isAdmin && <p className="mt-2 text-gray-400">Veuillez aller à l'onglet "Données".</p>}</div>;
    }

    if (!isAdmin) {
        const participant = filteredParticipants[0];
        if (!participant) {
            return <div className="text-center py-12"><h3 className="text-xl font-semibold text-white">Aucune information financière à afficher.</h3></div>;
        }

        const pFinancials = getParticipantFinancials(participant.cef);
        const inscriptionProgress = participant.fraisInscription > 0 ? (pFinancials.inscriptionPayment / participant.fraisInscription) * 100 : 100;
        
        const totalMonthlyPaid = Object.values(pFinancials.monthlyPayments).reduce((sum, val) => sum + val, 0);
        const formationProgress = participant.fraisFormation > 0 ? (totalMonthlyPaid / participant.fraisFormation) * 100 : 100;
        const balance = totalMonthlyPaid - participant.fraisFormation;

        const allMonthsMap = new Map(getMonthsForTrainingYear(participant.trainingYear).map(m => [m.value, m.label]));
        
        const monthlyPaymentsList = Object.entries(pFinancials.monthlyPayments)
            .map(([monthKey, amount]) => ({
                monthKey,
                monthLabel: allMonthsMap.get(monthKey) || monthKey,
                amount,
            }))
            .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Inscription Card */}
                    <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-semibold text-white">Frais d'Inscription</h3>
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${pFinancials.inscriptionStatus === 'Payé' ? 'bg-green-200 text-green-800' : 'bg-yellow-300 text-yellow-900'}`}>{pFinancials.inscriptionStatus}</span>
                        </div>
                        <p className="text-gray-400 mt-2">État de vos frais d'inscription.</p>
                        <div className="mt-4">
                            <p className="text-3xl font-bold text-white">{pFinancials.inscriptionPayment.toFixed(2).replace('.', ',')} DH <span className="text-lg text-gray-400">/ {participant.fraisInscription.toFixed(2).replace('.', ',')} DH</span></p>
                            <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                                <div className="bg-green-500 h-2.5 rounded-full" style={{width: `${Math.min(inscriptionProgress, 100)}%`}}></div>
                            </div>
                        </div>
                    </div>
                    {/* Formation Card */}
                     <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-semibold text-white">Frais de Formation</h3>
                             <div className="text-right">
                                <p className={`text-lg font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{balance.toFixed(2).replace('.', ',')} DH</p>
                                <p className="text-gray-400 text-sm -mt-1">Solde</p>
                                {balance >= 0 && (
                                    <p className="text-green-300 font-semibold text-xs mt-2 animate-pulse">
                                        Vous avez réglé tous vos frais de formation.
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-3xl font-bold text-white">{totalMonthlyPaid.toFixed(2).replace('.', ',')} DH <span className="text-lg text-gray-400">/ {participant.fraisFormation.toFixed(2).replace('.', ',')} DH</span></p>
                            <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                                <div className="bg-blue-500 h-2.5 rounded-full" style={{width: `${Math.min(formationProgress, 100)}%`}}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Détail des mensualités</h3>
                    {monthlyPaymentsList.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {monthlyPaymentsList.map(p => (
                                <div key={p.monthLabel} className="bg-gray-700 p-4 rounded-lg text-center shadow">
                                    <p className="text-xl font-bold text-green-400">{p.amount.toFixed(2).replace('.', ',')} DH</p>
                                    <p className="text-sm text-gray-300">{p.monthLabel}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-700 p-6 rounded-lg text-center shadow">
                            <p className="text-gray-400">Aucun versement mensuel enregistré pour le moment.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    

    // Admin View
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-700 rounded-lg">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Année</label>
                    <Select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedGroup('all'); }} options={trainingYears.map(y => ({ value: y, label: y }))} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Groupe</label>
                    <Select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} options={groupOptions} />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={handleExportCsv} disabled={filteredParticipants.length === 0}><FileSpreadsheetIcon className="h-4 w-4 mr-2" />Excel (CSV)</Button>
                <Button onClick={handlePrintPdf} disabled={filteredParticipants.length === 0}><PrinterIcon className="h-4 w-4 mr-2" />PDF</Button>
            </div>
            
            <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-lg max-h-[70vh]">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800 sticky top-0 z-30">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase sticky left-0 bg-gray-800 z-40">Participant</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase w-48">Inscription</th>
                            {months.map(m => <th key={m.value} className="px-2 py-3 text-center text-xs font-medium uppercase">{m.label.split(' ')[0].substring(0,3)}.</th>)}
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase">Total Payé</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase">Solde Formation</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {filteredParticipants.map(p => {
                            const pFinancials = getParticipantFinancials(p.cef);
                            const totalPaid = calculateTotalPaid(p, pFinancials);
                            const balance = calculateBalance(p, pFinancials);
                            const inscriptionStatus = pFinancials.inscriptionPayment >= p.fraisInscription ? 'Payé' : 'En attente';
                            const inscriptionCellId = `${p.cef}-inscription`;
                            
                            return (
                                <tr key={p.cef} className={isAdmin ? "hover:bg-gray-700/50" : ""}>
                                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-gray-800 group-hover:bg-gray-700/50 z-20">
                                        <div className="text-sm font-medium text-white">{p.nom} {p.prenom}</div>
                                        <div className="text-xs text-gray-400">{p.cef}</div>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        {editingCell === inscriptionCellId ? (
                                            <EditableCell
                                                initialValue={pFinancials.inscriptionPayment.toString().replace('.', ',')}
                                                onSave={(value) => handleSave(p.cef, 'inscription', pFinancials.inscriptionPayment, value)}
                                                onCancel={handleCancelEdit}
                                            />
                                        ) : (
                                            <div className={`flex flex-col items-start gap-1 group ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => handleEdit(inscriptionCellId, pFinancials.inscriptionPayment)}>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${inscriptionStatus === 'Payé' ? 'bg-green-200 text-green-800' : 'bg-yellow-300 text-yellow-900'}`}>{inscriptionStatus}</span>
                                                    {isAdmin && <EditIcon className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                </div>
                                                <div className="text-xs">
                                                    <span className={pFinancials.inscriptionPayment > 0 ? 'text-green-400' : 'text-gray-500'}>{pFinancials.inscriptionPayment.toFixed(2).replace('.', ',')}</span>
                                                    <span className="text-gray-400"> / {p.fraisInscription.toFixed(2).replace('.', ',')}</span>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    {months.map(m => {
                                        const payment = pFinancials.monthlyPayments[m.value] || 0;
                                        const cellId = `${p.cef}-${m.value}`;
                                        return (
                                            <td key={m.value} className="px-2 py-2 whitespace-nowrap text-center text-sm">
                                                {editingCell === cellId ? (
                                                     <EditableCell 
                                                        initialValue={payment > 0 ? payment.toString().replace('.', ',') : ''}
                                                        onSave={(value) => handleSave(p.cef, 'monthly', m.value, value)}
                                                        onCancel={handleCancelEdit}
                                                    />
                                                ) : (
                                                    <div className={`w-full h-full flex items-center justify-center min-h-[30px] rounded-md ${isAdmin ? 'cursor-pointer hover:bg-gray-700' : ''}`} onClick={() => handleEdit(cellId, payment)}>
                                                        <span className={payment > 0 ? 'text-green-400' : 'text-gray-500'}>
                                                            {payment > 0 ? payment.toFixed(2).replace('.', ',') : '-'}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="px-6 py-4 text-right font-semibold text-white">{totalPaid.toFixed(2).replace('.', ',')} DH</td>
                                    <td className={`px-6 py-4 text-right font-semibold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{balance.toFixed(2).replace('.', ',')} DH</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {isAdmin && (
                        <tfoot className="bg-gray-800 border-t-2 border-gray-600 sticky bottom-0">
                            <tr>
                                <td className="px-6 py-3 font-bold text-sm uppercase sticky left-0 bg-gray-800">Totaux</td>
                                <td className="px-4 py-3 text-left">
                                    <div className="text-xs font-bold text-white">{tableTotals.totalInscriptionPaid.toFixed(2).replace('.', ',')}</div>
                                    <div className="text-xs text-gray-400">/ {tableTotals.totalInscriptionFees.toFixed(2).replace('.', ',')}</div>
                                </td>
                                {months.map(m => (
                                    <td key={`total-${m.value}`} className="px-2 py-3 text-center text-sm font-bold text-white">
                                        {(tableTotals.monthlyTotals[m.value] || 0).toFixed(2).replace('.', ',')}
                                    </td>
                                ))}
                                <td className="px-6 py-3 text-right text-sm font-bold text-white">{tableTotals.grandTotalPaid.toFixed(2).replace('.', ',')} DH</td>
                                <td className={`px-6 py-3 text-right text-sm font-bold ${tableTotals.totalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {tableTotals.totalBalance.toFixed(2).replace('.', ',')} DH
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};