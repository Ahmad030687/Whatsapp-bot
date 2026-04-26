export default function handler(req, res) {
    res.status(200).json({
        bot: 'RDX Bot',
        status: 'Active',
        owner: 'Ahmad RDX',
        message: 'Vercel Working Perfectly!'
    });
}
