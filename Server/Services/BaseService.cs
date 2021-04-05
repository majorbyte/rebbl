using Microsoft.EntityFrameworkCore;
using rebbl.Server.Data;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace rebbl.Server.Services
{
    public class BaseService<T> where T : class
    {
        protected readonly ApplicationDbContext _context;
        public BaseService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<T> GetById(int id) 
        {
            return await _context.Set<T>().FindAsync(id);
        }

        public async Task<IReadOnlyList<T>> ListAll()
        {
            return await _context.Set<T>().ToListAsync();
        }

        public virtual async Task<T> GetByIdAsync(int id)
        {
            return await _context.Set<T>().FindAsync(id);
        }

        public async Task<IReadOnlyList<T>> ListAllAsync()
        {
            return await _context.Set<T>().ToListAsync();
        }

        public async Task DeleteMany(IEnumerable<T> entities)
        {
            _context.Set<T>().RemoveRange(entities);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<T>> AddManyAsync(IEnumerable<T> entities)
        {
            await _context.Set<T>().AddRangeAsync(entities);
            await _context.SaveChangesAsync();

            foreach (var entity in entities)
            {
                await _context.Entry(entity).ReloadAsync();
            }

            return entities;
        }

        public async Task<T> AddAsync(T entity)
        {
            _context.Set<T>().Add(entity);
            await _context.SaveChangesAsync();
            await _context.Entry(entity).ReloadAsync();

            return entity;
        }

        public async Task<T> UpdateAsync(T entity)
        {
            _context.Entry(entity).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            await _context.Entry(entity).ReloadAsync();

            return entity;
        }

        public async Task UpdateManyAsync(IEnumerable<T> entities)
        {
            var e = entities.ToArray();
            if (!e.Any())
                return;
            foreach (T entity in e)
            {
                _context.Entry(entity).State = EntityState.Modified;
            }
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(T entity)
        {
            _context.Set<T>().Remove(entity);
            await _context.SaveChangesAsync();
        }
    }
}
