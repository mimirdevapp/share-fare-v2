import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Users, ReceiptIndianRupee, Calculator, ListChecks, ReceiptText, Send, ExternalLink, BadgePercent, ScanText, Loader2, X, Edit2, Check, Hash } from 'lucide-react';

// Color palette for friend avatars
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500',
];

const FRIEND_GROUPS = {
  'ecityhp': ['Shetty', 'Madhu', 'Shaun', 'Sai', 'Calvin', 'Gaman', 'Rishika', 'Siddhanth', 'Sharanya', 'Rachana'],
  'hsr': ['Calvin', 'Gaman', 'Hardhik', 'Jason'],
};

// Helper function to get friend color
const getFriendColor = (index) => {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
};

// Helper function to get initials
const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
const generateShareMessage = (perPerson, billAmount, totalCalculated, difference) => {
  let message = `*ShareFare - Bill Split Summary*\n\n`;
  message += `Bill Amount: ₹${parseFloat(billAmount).toFixed(2)}\n\n`;
  message += `*Individual Breakdown:*\n`;

  Object.values(perPerson).forEach((person) => {
    message += `• ${person.name}: ₹${person.amount.toFixed(2)}\n`;
  });

  return encodeURIComponent(message);
};

export default function Main() {
  const [billAmount, setBillAmount] = useState('');
  const [currentBillId, setCurrentBillId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseShares, setExpenseShares] = useState([]);
  const [savedFriendNames, setSavedFriendNames] = useState([]);

  const [newFriendName, setNewFriendName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupCodeError, setGroupCodeError] = useState('');
  const [newExpense, setNewExpense] = useState({ dish_name: '', cost: '' });
  const [selectedFriends, setSelectedFriends] = useState([]);

  const [taxAmount, setTaxAmount] = useState('0');
  const [serviceFee, setServiceFee] = useState('0');
  const [tips, setTips] = useState('0');
  const [discountType, setDiscountType] = useState('flat');
  const [discountValue, setDiscountValue] = useState('0');

  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingExpenseShares, setEditingExpenseShares] = useState([]);

  const [splitwiseLoading, setSplitWiseLoading] = useState(false);

  // Load saved friends and API key on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('shareFareFriends');
      if (saved) {
        setSavedFriendNames(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Session storage not available');
    }
  }, []);

  // Save friends whenever they change
  useEffect(() => {
    if (friends.length > 0) {
      const names = friends.map(f => f.name);
      try {
        sessionStorage.setItem('shareFareFriends', JSON.stringify(names));
        setSavedFriendNames(names);
      } catch (e) {
        console.log('Session storage not available');
      }
    }
  }, [friends]);

  const createBill = () => {
    if (!billAmount || parseFloat(billAmount) <= 0) return;
    setCurrentBillId(Date.now().toString());
  };

  const shareOnWhatsApp = () => {
    const message = generateShareMessage(perPerson, billAmount, totalCalculated, difference);
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const processBillImage = async (file) => {
    setIsProcessing(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("https://enki-service.vercel.app/api/share-fare-service", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to process image');
      }

      const data = await response.json();

      if (!data.success || !data.billData) {
        throw new Error('Invalid response format from server');
      }

      const billData = data.billData;

      // Set bill amount
      if (billData.total) {
        setBillAmount(billData.total.toString());
      }

      // Create bill and add expenses
      const newBillId = Date.now().toString();
      setCurrentBillId(newBillId);

      // Set common costs
      if (billData.tax) setTaxAmount(billData.tax.toString());
      if (billData.serviceFee) setServiceFee(billData.serviceFee.toString());
      if (billData.tips) setTips(billData.tips.toString());
      if (billData.discount) {
        setDiscountValue(billData.discount.toString());
        setDiscountType('flat');
      }

      // Add items as expenses (without any friend assignments initially)
      if (billData.items && billData.items.length > 0) {
        const newExpenses = billData.items.map((item, index) => ({
          id: `${newBillId}-${index}`,
          dish_name: item.name,
          cost: parseFloat(item.price)
        }));
        setExpenses(newExpenses);
      }

      setUploadError('');
    } catch (error) {
      console.error('Error processing bill:', error);
      setUploadError(error.message || 'Failed to process bill image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please upload an image file');
        return;
      }
      processBillImage(file);
    }
  };

  const addFriend = () => {
    if (!newFriendName.trim() || !currentBillId) return;

    const newFriend = {
      id: Date.now().toString(),
      name: newFriendName.trim()
    };

    setFriends([...friends, newFriend]);
    setNewFriendName('');
  };

  const applyGroupCode = () => {
    if (!groupCode.trim() || !currentBillId) return;

    const friendNames = FRIEND_GROUPS[groupCode.toLowerCase()];

    if (!friendNames) {
      setGroupCodeError('Invalid group code');
      return;
    }

    // Add all friends from the group
    const newFriends = friendNames.map((name, index) => ({
      id: `${Date.now()}-${index}`,
      name: name
    }));

    setFriends([...friends, ...newFriends]);
    setGroupCode('');
    setGroupCodeError('');
  };

  const removeFriend = (friendId) => {
    setFriends(friends.filter(f => f.id !== friendId));
    setExpenseShares(expenseShares.filter(es => es.friend_id !== friendId));
  };

  const addExpense = () => {
    if (!newExpense.dish_name.trim() || !newExpense.cost || parseFloat(newExpense.cost) <= 0 || !currentBillId || selectedFriends.length === 0) return;

    const expense = {
      id: Date.now().toString(),
      dish_name: newExpense.dish_name.trim(),
      cost: parseFloat(newExpense.cost)
    };

    setExpenses([...expenses, expense]);

    const shares = selectedFriends.map(friendId => ({
      id: `${expense.id}-${friendId}`,
      expense_id: expense.id,
      friend_id: friendId
    }));

    setExpenseShares([...expenseShares, ...shares]);
    setNewExpense({ dish_name: '', cost: '' });
    setSelectedFriends([]);
  };

  const removeExpense = (expenseId) => {
    setExpenses(expenses.filter(e => e.id !== expenseId));
    setExpenseShares(expenseShares.filter(es => es.expense_id !== expenseId));
    if (editingExpenseId === expenseId) {
      setEditingExpenseId(null);
      setEditingExpenseShares([]);
    }
  };

  const startEditingExpense = (expenseId) => {
    const currentShares = expenseShares
      .filter(es => es.expense_id === expenseId)
      .map(es => es.friend_id);
    setEditingExpenseId(expenseId);
    setEditingExpenseShares(currentShares);
  };

  const toggleEditingFriend = (friendId) => {
    setEditingExpenseShares(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const sendToSplitwise = async () => {
  setSplitWiseLoading(true);
  
  try {
    const expenseData = Object.values(perPerson).map(person => ({
      name: person.name,
      amount: person.amount,
    }));

    const response = await fetch('https://enki-service.vercel.app/api/splitwise-add-expense', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billAmount: parseFloat(billAmount),
        billDescription: `ShareFare Bill`,
        expenses: expenseData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync with Splitwise');
    }

    const data = await response.json();
    
    if (data.notFound && data.notFound.length > 0) {
      alert(`${data.message}\n\nThese friends weren't found in your Splitwise account. Please add them first:\n${data.notFound.join(', ')}`);
    } else {
      const splitwiseUrl = 'https://secure.splitwise.com/applinks/open';
      const splitwiseWeb = 'https://secure.splitwise.com';
      
      // Try to open the app first, fallback to web
      window.location.href = splitwiseUrl;
      setTimeout(() => {
        window.open(splitwiseWeb, '_blank');
      }, 500);
    }
    
  } catch (error) {
    alert(`Failed to add to Splitwise: ${error.message}`);
  } finally {
    setSplitWiseLoading(false);
  }
};


  const saveExpenseShares = () => {
    if (!editingExpenseId) return;

    // Remove old shares for this expense
    const filteredShares = expenseShares.filter(es => es.expense_id !== editingExpenseId);

    // Add new shares
    const newShares = editingExpenseShares.map(friendId => ({
      id: `${editingExpenseId}-${friendId}`,
      expense_id: editingExpenseId,
      friend_id: friendId
    }));

    setExpenseShares([...filteredShares, ...newShares]);
    setEditingExpenseId(null);
    setEditingExpenseShares([]);
  };

  const cancelEditingExpense = () => {
    setEditingExpenseId(null);
    setEditingExpenseShares([]);
  };

  const calculateSplit = () => {
    if (friends.length === 0) {
      return { perPerson: {}, totalCalculated: 0, difference: 0 };
    }

    const perPerson = {};

    friends.forEach(friend => {
      perPerson[friend.id] = { name: friend.name, amount: 0, items: [] };
    });

    let totalExpenses = 0;
    expenses.forEach(expense => {
      const shareCount = expenseShares.filter(es => es.expense_id === expense.id).length;
      if (shareCount > 0) {
        const perPersonCost = expense.cost / shareCount;
        expenseShares.forEach(share => {
          if (share.expense_id === expense.id && perPerson[share.friend_id]) {
            perPerson[share.friend_id].amount += perPersonCost;
            perPerson[share.friend_id].items.push(`${expense.dish_name} (${shareCount > 1 ? 'shared' : 'solo'})`);
          }
        });
        totalExpenses += expense.cost;
      }
    });

    const discountAmount = discountType === 'percentage'
      ? (totalExpenses * parseFloat(discountValue) / 100)
      : parseFloat(discountValue);

    const afterDiscount = totalExpenses - discountAmount;
    const commonTotal = parseFloat(taxAmount) + parseFloat(serviceFee) + parseFloat(tips);
    const perPersonCommonCost = commonTotal / friends.length;

    const itemsSubtotal = totalExpenses;
    const totalWithCommonCosts = afterDiscount + commonTotal;

    friends.forEach(friend => {
      const friendItemTotal = perPerson[friend.id].amount;
      const friendProportion = itemsSubtotal > 0 ? friendItemTotal / itemsSubtotal : 1 / friends.length;
      const friendDiscount = discountAmount * friendProportion;

      perPerson[friend.id].amount = friendItemTotal - friendDiscount + perPersonCommonCost;
    });

    const totalCalculated = Object.values(perPerson).reduce((sum, person) => sum + person.amount, 0);
    const difference = parseFloat(billAmount) - totalCalculated;

    return { perPerson, totalCalculated, difference };
  };

  const { perPerson, totalCalculated, difference } = calculateSplit();

  const toggleFriendSelection = (friendId) => {
    setSelectedFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const resetBill = () => {
    setBillAmount('');
    setCurrentBillId(null);
    setFriends([]);
    setExpenses([]);
    setExpenseShares([]);
    setNewFriendName('');
    setGroupCode('');
    setGroupCodeError('');
    setNewExpense({ dish_name: '', cost: '' });
    setSelectedFriends([]);
    setTaxAmount('0');
    setServiceFee('0');
    setTips('0');
    setDiscountValue('0');
    setUploadError('');
    setEditingExpenseId(null);
    setEditingExpenseShares([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 onClick={() => resetBill()} className="text-4xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-3">
            <ReceiptIndianRupee className="w-10 h-10 text-blue-600" />
            ShareFare
          </h1>
          <p className="text-slate-600">Split bills fairly among friends</p>
        </div>

        {!currentBillId ? (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Enter Bill Amount</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Total Bill Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
              </div>
              <button
                onClick={createBill}
                disabled={!billAmount || parseFloat(billAmount) <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Start Splitting Manually
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">or</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-orange-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing Bill...
                    </>
                  ) : (
                    <>
                      <ScanText className="w-5 h-5" />
                      Scan Bill
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Friends
                </h2>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFriend()}
                    placeholder="Friend's name"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={addFriend}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="mb-4 p-3 border border-purple-300 rounded-lg bg-purple-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-purple-600" />
                    <label className="text-sm font-medium">Or use a group code</label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={groupCode}
                      onChange={(e) => {
                        setGroupCode(e.target.value);
                        setGroupCodeError('');
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && applyGroupCode()}
                      placeholder="Enter group code"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                    />
                    <button
                      onClick={applyGroupCode}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                    >
                      Apply
                    </button>
                  </div>
                  {groupCodeError && (
                    <p className="text-red-600 text-sm mt-2">{groupCodeError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  {friends.map((friend, index) => (
                    <div key={friend.id} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${getFriendColor(index)} flex items-center justify-center text-white font-semibold shadow-md`}>
                          {getInitials(friend.name)}
                        </div>
                        <span className="font-medium text-slate-700">{friend.name}</span>
                      </div>
                      <button
                        onClick={() => removeFriend(friend.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {friends.length === 0 && (
                    <div className="text-slate-500 text-center py-4">
                      <p className="mb-2">No friends added yet</p>
                      {savedFriendNames.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm mb-2">Quick add from previous sessions:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {savedFriendNames.slice(0, 5).map((name, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setNewFriendName(name);
                                }}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-blue-600" />
                  Expenses
                </h2>
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newExpense.dish_name}
                      onChange={(e) => setNewExpense({ ...newExpense, dish_name: e.target.value })}
                      placeholder="Expense Name"
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newExpense.cost}
                      onChange={(e) => setNewExpense({ ...newExpense, cost: e.target.value })}
                      placeholder="Cost"
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {friends.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Who ordered this?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {friends.map((friend, index) => (
                          <button
                            key={friend.id}
                            onClick={() => toggleFriendSelection(friend.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedFriends.includes(friend.id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                          >
                            <div className={`w-6 h-6 rounded-full ${selectedFriends.includes(friend.id) ? 'bg-white/20' : getFriendColor(index)} flex items-center justify-center text-xs font-semibold ${selectedFriends.includes(friend.id) ? 'text-white' : 'text-white'}`}>
                              {getInitials(friend.name)}
                            </div>
                            {friend.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={addExpense}
                    disabled={!newExpense.dish_name || !newExpense.cost || selectedFriends.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Expense
                  </button>
                </div>
                <div className="space-y-2">
                  {expenses.map(expense => {
                    const sharedByIds = expenseShares
                      .filter(es => es.expense_id === expense.id)
                      .map(es => es.friend_id);
                    const sharedByFriends = sharedByIds
                      .map(id => friends.find(f => f.id === id))
                      .filter(Boolean);

                    const isEditing = editingExpenseId === expense.id;

                    return (
                      <div key={expense.id} className="bg-slate-50 px-4 py-3 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">{expense.dish_name}</div>
                            <div className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                              <span>₹ {expense.cost.toFixed(2)}</span>
                              {!isEditing && sharedByFriends.length > 0 && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    {sharedByFriends.map((friend) => {
                                      const friendIndex = friends.findIndex(f => f.id === friend.id);
                                      return (
                                        <div
                                          key={friend.id}
                                          className={`w-6 h-6 rounded-full ${getFriendColor(friendIndex)} flex items-center justify-center text-xs font-semibold text-white border-2 border-white shadow-sm`}
                                          title={friend.name}
                                        >
                                          {getInitials(friend.name)}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                              {!isEditing && sharedByFriends.length === 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-orange-600 font-medium">Not assigned</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {!isEditing && friends.length > 0 && (
                              <button
                                onClick={() => startEditingExpense(expense.id)}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                title="Edit who shares this"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => removeExpense(expense.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Who shares this expense?
                            </label>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {friends.map((friend, index) => (
                                <button
                                  key={friend.id}
                                  onClick={() => toggleEditingFriend(friend.id)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${editingExpenseShares.includes(friend.id)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                    }`}
                                >
                                  <div className={`w-6 h-6 rounded-full ${editingExpenseShares.includes(friend.id) ? 'bg-white/20' : getFriendColor(index)} flex items-center justify-center text-xs font-semibold ${editingExpenseShares.includes(friend.id) ? 'text-white' : 'text-white'}`}>
                                    {getInitials(friend.name)}
                                  </div>
                                  {friend.name}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={saveExpenseShares}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                <Check className="w-4 h-4" />
                                Save
                              </button>
                              <button
                                onClick={cancelEditingExpense}
                                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {expenses.length === 0 && (
                    <p className="text-slate-500 text-center py-4">No expenses added yet</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-blue-600" />
                  Common Costs
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tax</label>
                    <input
                      type="number"
                      step="0.01"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Service Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      value={serviceFee}
                      onChange={(e) => setServiceFee(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tips</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tips}
                      onChange={(e) => setTips(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <BadgePercent className="w-5 h-5 text-blue-600" />
                  Discount
                </h2>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="flat">₹</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  Summary
                </h2>
                <div className="space-y-4">
                  <div className="pb-4 border-b border-slate-200">
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>Bill Amount:</span>
                      <span className="font-semibold">₹ {parseFloat(billAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>Calculated Total:</span>
                      <span className="font-semibold">₹ {totalCalculated.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-semibold ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      <span>Difference:</span>
                      <span>₹ {Math.abs(difference).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.values(perPerson).map((person, index) => (
                      <div key={person.name} className="bg-slate-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${getFriendColor(index)} flex items-center justify-center text-white font-semibold text-sm shadow-md`}>
                              {getInitials(person.name)}
                            </div>
                            <span className="font-semibold text-slate-800">{person.name}</span>
                          </div>
                          <span className="text-lg font-bold text-blue-600">₹ {person.amount.toFixed(2)}</span>
                        </div>
                        {person.items.length > 0 && (
                          <div className="text-xs text-slate-600 space-y-1 ml-10">
                            {person.items.map((item, idx) => (
                              <div key={idx}>• {item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {friends.length === 0 && (
                      <p className="text-slate-500 text-center py-4">Add friends to see split</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={shareOnWhatsApp}
                      disabled={friends.length === 0}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Share on WhatsApp
                    </button>
                    <button
                      onClick={sendToSplitwise}
                      disabled={friends.length === 0 || splitwiseLoading}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {splitwiseLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Add to Splitwise
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}